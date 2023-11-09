import { ConfigurationBase } from '@themost/common';
import {resolve} from 'path';
import {
    DataConfigurationStrategy,
    NamedDataContext,
    DataApplication,
    DataCacheStrategy,
} from '@themost/data';

export class TestApplication extends DataApplication {

    constructor() {
        const executionPath = resolve(__dirname, 'test');
        super(executionPath);
        // init application configuration
        this._configuration = new ConfigurationBase(resolve(executionPath, 'config'));
        this._configuration.setSourceAt('adapterTypes', [
            {
                'name':'Test Data Adapter', 
                'invariantName': 'sqlite',
                'type': '@themost/sqlite'
            }
        ]);
        this._configuration.setSourceAt('adapters', [
            { 
                'name': 'test',
                'invariantName': 'sqlite',
                'default':true,
                'options': {
                    'db': resolve(__dirname, 'test/db/local.db') 
                }
            }
        ]);
        // use data configuration strategy
        this._configuration.useStrategy(DataConfigurationStrategy, DataConfigurationStrategy);
    }

    createContext() {
        const adapters = this._configuration.getSourceAt('adapters');
        const adapter = adapters.find((item)=> {
            return item.default;
        });
        const context = new NamedDataContext(adapter.name);
        context.getConfiguration = () => {
            return this._configuration;
        };
        return context;
    }

    async finalize() {
        const service = this.getConfiguration().getStrategy(DataCacheStrategy);
        if (typeof service.finalize === 'function') {
            await service.finalize();
        }
    }

}
