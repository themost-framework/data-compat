import { DataModelCreateViewListener as DataModelCreateViewListenerCompat } from './DataModelCreateViewListener';
import { DataModelCreateViewListener } from '@themost/data';


if (DataModelCreateViewListener.prototype.afterUpgrade != DataModelCreateViewListenerCompat.prototype.afterUpgrade) {
    DataModelCreateViewListener.prototype.afterUpgrade = DataModelCreateViewListenerCompat.prototype.afterUpgrade;
}
