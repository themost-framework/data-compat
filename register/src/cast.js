// eslint-disable-next-line no-unused-vars
import { DataModel } from '@themost/data';


function hasOwnProperty(any, name) {
    return Object.prototype.hasOwnProperty.call(any, name);
}

/**
 * @this {DataModel}
 * @param {*} obj 
 * @param {*} state 
 * @returns 
 */
function cast(obj, state) {
    const self = this;
    if (obj == null) {
        return {};
    }
    if (Array.isArray(obj)) {
        return obj.map((x) => {
            return self.cast(x, state);
        });
    } else {
        let currentState = (state == null) ? (obj.$state == null ? 1 : obj.$state) : state;
        let result = {};
        let name;
        let superModel;
        if (typeof obj.getSuperModel === 'function') {
            superModel = obj.getSuperModel();
        }
        self.attributes.filter(function (x) {
            return hasOwnProperty(x, 'many') ? !x.many : true;
        }).filter((x) => {
            if (x.model !== self.name) { return false; }
            return (!x.readonly) ||
                (x.readonly && (typeof x.calculation !== 'undefined') && currentState === 2) ||
                (x.readonly && (typeof x.value !== 'undefined') && currentState === 1) ||
                (x.readonly && (typeof x.calculation !== 'undefined') && currentState === 1);
        }).filter((y) => {
            /*
            change: 2016-02-27
            author:k.barbounakis@gmail.com
            description:exclude non editable attributes on update operation
             */
            return (currentState === 2) ? (hasOwnProperty(y, 'editable') ? y.editable : true) : true;
        }).filter((x) => {
            if (x.insertable === false && x.editable === false) {
                return false;
            }
            return true;
        }).forEach((x) => {
            name = hasOwnProperty(obj, x.property) ? x.property : x.name;
            if (hasOwnProperty(obj, name)) {
                let mapping = self.inferMapping(name);
                //if mapping is empty and a super model is defined
                if (mapping == null) {
                    if (superModel && x.type === 'Object') {
                        //try to find if superModel has a mapping for this attribute
                        mapping = superModel.inferMapping(name);
                    }
                }
                if (mapping == null) {
                    result[x.name] = obj[name];
                }
                else if (mapping.associationType === 'association') {
                    if (typeof obj[name] === 'object' && obj[name] !== null)
                        //set associated key value (e.g. primary key value)
                        result[x.name] = obj[name][mapping.parentField];
                    else
                        //set raw value
                        result[x.name] = obj[name];
                }
            }
        });
        return result;
    }
}

if (DataModel.prototype.cast != cast) {
    Object.assign(DataModel.prototype, {
        cast
    });
}