// eslint-disable-next-line no-unused-vars
import { DataModel, DataModelMigration } from '@themost/data';
import { DataError } from '@themost/common';
import { eachSeries } from 'async';


/**
 * @this {DataModel}
 * @param {Function} callback
 */
function migrate(callback)
{
    const self = this;
    //prepare migration cache
    const configuration = self.context.getConfiguration();
    configuration.cache = configuration.cache || { };
    if (Object.prototype.hasOwnProperty.call(configuration.cache, self.name) === false) {
        // set cache
        Object.defineProperty(configuration.cache, self.name, {
            configurable: true,
            enumerable: true,
            writable: true,
            value: {}
        });
    }
    if (configuration.cache[self.name].version === self.version) {
        //model has already been migrated, so do nothing
        return callback(null, false);
    }
    if (self.abstract) {
        return new callback(new DataError('EABSTRACT','An abstract model cannot be instantiated.',null,self.name));
    }
    //do not migrate sealed models
    if (self.sealed) {
        return callback(null, false);
    }
    const context = self.context;
    //do migration
    const fields = self.attributes.filter(function(x) {
        if (x.insertable === false && x.editable === false && x.model === self.name) {
            if (typeof x.query === 'undefined') {
                throw new DataError('E_MODEL', 'A non-insertable and non-editable field should have a custom query defined.', null, self.name, x.name);
            }
            // validate source and view
            if (self.sourceAdapter === self.viewAdapter) {
                throw new DataError('E_MODEL', 'A data model with the same source and view data object cannot have virtual columns.', null, self.name, x.name);
            }
            // exclude virtual column
            return false;
        }
        return (self.name === x.model) && (!x.many);
    });

    if ((fields===null) || (fields.length===0))
        throw new Error('Migration is not valid for this model. The model has no fields.');
        const migration = new DataModelMigration();
    migration.add = fields.map(function(x) {
        return Object.assign({}, x);
    });
    migration.version = self.version != null ? self.version : '0.0';
    migration.appliesTo = self.sourceAdapter;
    migration.model = self.name;
    migration.description = `${this.title || this.name} migration (version ${ migration.version})`;
    if (context===null)
        throw new Error('The underlying data context cannot be empty.');

    //get all related models
    const models = [];
    const db = context.db;
    const baseModel = self.base();
    if (baseModel!==null) {
        models.push(baseModel);
    }
    //validate associated models
    migration.add.forEach(function(x) {
        //validate mapping
        const mapping = self.inferMapping(x.name);
        if (mapping && mapping.associationType === 'association') {
            if (mapping.childModel === self.name) {
                //get parent model
                const parentModel = self.context.model(mapping.parentModel);
                const attr = parentModel.getAttribute(mapping.parentField);
                if (attr) {
                        if (attr.type === 'Counter') {
                            x.type = 'Integer';
                        }
                        else {
                            x.type = attr.type;
                        }

                }
            }
            migration.indexes.push({
                name: 'INDEX_' + migration.appliesTo.toUpperCase() + '_' + x.name.toUpperCase(),
                columns: [ x.name ]
            });
        }
        else if (x.indexed === true) {
            migration.indexes.push({
                name: 'INDEX_' + migration.appliesTo.toUpperCase() + '_' + x.name.toUpperCase(),
                columns: [ x.name ]
            });
        }
    });

    //execute transaction
    db.executeInTransaction(function(tr) {
        if (models.length===0) {
            self.emit('before.upgrade', { model:self }, function(err) {
                if (err) { return tr(err); }
                db.migrate(migration, function(err) {
                    if (err) { return tr(err); }
                    if (migration.updated) {
                        return tr();
                    }
                    //execute after migrate events
                    self.emit('after.upgrade', { model:self }, function(err) {
                        migration.updated = true;
                        return tr(err);
                    });
                });
            });
        }
        else {
            eachSeries(models,function(m, cb)
            {
                if (m) {
                    m.migrate(cb);
                }
                else {
                    return cb();
                }
            }, function(err) {
                if (err) { return tr(err); }
                self.emit('before.upgrade', { model:self }, function(err) {
                    if (err) { return tr(err); }
                    db.migrate(migration, function(err) {
                        if (err) { return tr(err);  }
                        if (migration.updated) {
                            return tr();
                        }
                        //execute after migrate events
                        self.emit('after.upgrade', { model:self }, function(err) {
                            migration.updated = true;
                            return tr(err);
                        });
                    });
                });
            });
        }
    }, function(err) {
        if (err) {
            return callback(err);
        }
        try {
            // validate caching property
            if (Object.prototype.hasOwnProperty.call(configuration.cache, self.name) === false) {
                // and assign it if it's missing
                Object.defineProperty(configuration.cache, self.name, {
                    configurable: true,
                    enumerable: true,
                    writable: true,
                    value: {}
                });
            }
            // get caching property
            const cached = Object.getOwnPropertyDescriptor(configuration.cache, self.name);
            Object.assign(cached.value, {
                version: self.version
            });
        } catch(err1) {
            return callback(err1);
        }
        return callback(null, !!migration.updated);
    });
}

if (DataModel.prototype.migrate != migrate) {
    Object.assign(DataModel.prototype, {
        migrate
    });
}