import { DataEventArgs } from '@themost/data';

export declare class DataModelCreateViewListener {

    afterUpgrade(event: DataEventArgs, callback: (err?: Error) => void): void;
}