// eslint-disable-next-line no-unused-vars
import { DataModel, DataConfigurationStrategy } from '@themost/data';
import pluralize from 'pluralize';

/**
 * @this {DataModel}
 */
function initialize() {

    let attributes;
    const self =this;
    function get() {
        //validate self field collection
        if (typeof attributes !== 'undefined' && attributes !== null)
            return attributes;
        //init attributes collection
        attributes = [];
        //get base model (if any)
        const baseModel = self.base();
        let field;
        let implementedModel;
        if (self.implements) {
            implementedModel = self.context.model(self.implements)
        }
        //enumerate fields
        const strategy = self.context.getConfiguration().getStrategy(DataConfigurationStrategy);
        self.fields.forEach(function(x) {
            if (typeof x.many === 'undefined') {
                if (typeof strategy.dataTypes[x.type] === 'undefined')
                    //set one-to-many attribute (based on a naming convention)
                    x.many = pluralize.isPlural(x.name) || (x.mapping && x.mapping.associationType === 'junction');
                else
                    //otherwise set one-to-many attribute to false
                    x.many = false;
            }
            // define virtual attribute
            if (x.many) {
                // set multiplicity property EdmMultiplicity.Many
                if (Object.prototype.hasOwnProperty.call(x, 'multiplicity') === false) {
                    x.multiplicity = 'Many';
                }
            }
            if (x.nested) {
                // try to find if current field defines one-to-one association
                const mapping = x.mapping;
                if (mapping &&
                    mapping.associationType === 'association' &&
                    mapping.parentModel === self.name) {
                    /**
                     * get child model
                     * @type {DataModel}
                     */
                    const childModel = (mapping.childModel === self.name) ? self : self.context.model(mapping.childModel);
                    // check child model constraints for one-to-one parent to child association
                    if (childModel &&
                        childModel.constraints &&
                        childModel.constraints.length &&
                        childModel.constraints.find(function (constraint) {
                            return constraint.type === 'unique' &&
                                constraint.fields &&
                                constraint.fields.length === 1 &&
                                constraint.fields.indexOf(mapping.childField) === 0;
                        })) {
                        // backward compatibility  issue
                        // set [many] attribute to true because is being used by query processing
                        x.many = true;
                        // set multiplicity property EdmMultiplicity.ZeroOrOne or EdmMultiplicity.One
                        if (typeof x.nullable === 'boolean') {
                            x.multiplicity = x.nullable ? 'ZeroOrOne' : 'One';
                        }
                        else {
                            x.multiplicity = 'ZeroOrOne';
                        }

                    }
                }
            }

            //re-define field model attribute
            if (typeof x.model === 'undefined')
                x.model = self.name;
            let clone = x;
            // if base model exists and current field is not primary key field
            const isPrimary = !!x.primary;
            if (baseModel != null && isPrimary === false) {
                // get base field
                field = baseModel.field(x.name);
                if (field) {
                    //clone field
                    clone = { };
                    //get all inherited properties
                    Object.assign(clone, field);
                    //get all overridden properties
                    Object.assign(clone, x);
                    //set field model
                    clone.model = field.model;
                    //set cloned attribute
                    clone.cloned = true;
                }
            }
            if (clone.insertable === false && clone.editable === false && clone.model === self.name) {
                clone.readonly = true;
            }
            //finally push field
            attributes.push(clone);
        });
        if (baseModel) {
            baseModel.attributes.forEach(function(x) {
                if (!x.primary) {
                    //check if member is overridden by the current model
                    field = self.fields.find(function(y) { return y.name === x.name; });
                    if (typeof field === 'undefined')
                        attributes.push(x);
                }
                else {
                    //try to find primary key in fields collection
                    let primaryKey = self.fields.find((y) => {
                        return y.name === x.name;
                    });
                    if (primaryKey == null) {
                        //add primary key field
                        primaryKey = Object.assign({}, x, {
                            'type': x.type === 'Counter' ? 'Integer' : x.type,
                            'model': self.name,
                            'indexed': true,
                            'value': null,
                            'calculation': null
                        });
                        delete primaryKey.value;
                        delete primaryKey.calculation;
                        attributes.push(primaryKey);
                    }
                }
            });
        }
        if (implementedModel) {
            implementedModel.attributes.forEach(function(x) {
                field = self.fields.find((y) => {
                    return y.name === x.name;
                });
                if (field == null) {
                    attributes.push(Object.assign({}, x, {
                        model:self.name
                    }));
                }
            });
        }
        return attributes;
    }

    const configurable = true;
    const enumerable = false;
    Object.defineProperty(self, 'attributes', {
        get,
        configurable,
        enumerable
    });

}

if (DataModel.prototype.initialize != initialize) {
    Object.assign(DataModel.prototype, {
        initialize
    });
}