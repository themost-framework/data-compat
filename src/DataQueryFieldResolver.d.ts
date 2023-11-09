import { DataModel, DataField } from '@themost/data';
import { QueryField, QueryEntity } from '@themost/query';


export declare class DataFieldQueryResolver {
    constructor(target: DataModel);
    resolve(field: DataField): { $select?: QueryField, $expand?: QueryEntity[] };
}