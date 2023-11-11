import { DataModelCreateViewListener as DataModelCreateViewListenerCompat } from '@themost/data-compat';
import { DataModelCreateViewListener } from '@themost/data';


if (DataModelCreateViewListener.prototype.afterUpgrade != DataModelCreateViewListenerCompat.prototype.afterUpgrade) {
    DataModelCreateViewListener.prototype.afterUpgrade = DataModelCreateViewListenerCompat.prototype.afterUpgrade;
}
