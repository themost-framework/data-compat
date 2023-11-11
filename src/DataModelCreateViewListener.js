import { DataFieldQueryResolver } from './DataFieldQueryResolver';
import { DataError } from '@themost/common'; 
import { QueryField, QueryUtils, QueryFieldRef } from '@themost/query';
import { isEqual } from 'lodash';


class DataModelCreateViewListener {

    constructor() {
        //
    }
    /**
     * Occurs after upgrading a data model.
     * @param {DataEventArgs} event - An object that represents the event arguments passed to this operation.
     * @param {Function} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occurred.
     */
    afterUpgrade(event, callback) {

        const self = event.model;
        const db = self.context.db;
        const view = self.viewAdapter;
        const adapter = self.sourceAdapter;
        // if data model is a sealed model do nothing anb exit
        if (self.sealed) {
            return callback();
        }
        // if view adapter is the same with source adapter do nothing and exit
        if (view === adapter) {
            return callback();
        }
        // get base model
        let baseModel = self.base();
        let additionalExpand = [];
        // get array of fields
        let fields = [];
        try {
            fields = self.attributes.filter(function (x) {
                return (self.name === x.model) && (!x.many);
            }).map(function (x) {
                if (x.readonly && x.query) {
                    // resolve field expression (and additional joins)
                    const expr = new DataFieldQueryResolver(self).resolve(x);
                    if (expr) {
                        // hold additional joins
                        additionalExpand.push.apply(additionalExpand, expr.$expand);
                        // and return the resolved query expression for this field
                        return expr.$select;
                    }
                    // throw error
                    throw new DataError('E_QUERY', 'The given field defines a custom query expression but it cannot be resolved', null, self.name, x.name);
                }
                return QueryField.select(x.name).from(adapter);
            });
        } catch (error) {
            return callback(error);
        }
        /**
         * @type {import("@themost/query").QueryExpression}
         */
        let q = QueryUtils.query(adapter).select(fields);
        let baseAdapter = null;
        let baseFields = [];
        // enumerate attributes of base model (if any)
        if (baseModel) {
            // get base adapter
            baseAdapter = baseModel.viewAdapter;
            // enumerate base model attributes
            baseModel.attributes.forEach(function (x) {
                //get all fields (except primary and one-to-many relations)
                if ((!x.primary) && (!x.many))
                    baseFields.push(QueryField.select(x.name).from(baseAdapter));
            });
        }
        q.$expand = [];
        if (baseFields.length > 0) {
            let from = new QueryFieldRef(adapter, self.key().name);
            let to = new QueryFieldRef(baseAdapter, self.base().key().name);
            let addExpand = { $entity: {}, $with: [] };
            addExpand.$entity[baseAdapter] = baseFields;
            addExpand.$with.push(from);
            addExpand.$with.push(to);
            q.$expand.push(addExpand);
        }
        for (const expand of additionalExpand) {
            let findIndex = q.$expand.findIndex(function (item) {
                return isEqual(expand, item);
            });
            if (findIndex < 0) {
                q.$expand.push(expand);
            }
        }
        //execute query
        return db.createView(view, q, function (err) {
            callback(err);
        });
    }
}

export {
    DataModelCreateViewListener
}