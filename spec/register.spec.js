import '@themost/data-compat/register';
import { SchemaLoaderStrategy } from '@themost/data';
import { TestApplication } from './TestApplication';


describe('Service', () => {

    /**
     * @type {import('@themost/data').DataContext}
     */
    let context;
    beforeAll(() => {
        const app = new TestApplication();
        context = app.createContext();
    })

    afterAll(async () => {
        await context.finalizeAsync();
    })

    it('should use readonly fields', async () => {

        const attributes = context.model('Person').attributes;
        expect(attributes).toBeTruthy();

        /**
         * @type {import('@themost/data').SchemaLoaderStrategy}
         */
        const schemaLoader = context.getConfiguration().getStrategy(SchemaLoaderStrategy)
        /**
         * @type {import('@themost/data').DataModel}
         */
        const model = schemaLoader.getModelDefinition('Person');
        model.version = '2.5';
        model.fields.push({
            '@id': 'http://schema.org/fullName',
            'name': 'fullName',
            'readonly': true,
            'insertable': false,
            'editable': false,
            'type': 'Text',
            'query': [
                {
                    '$project': {
                        'fullName': {
                            '$concat': [
                                '$givenName',
                                ' ',
                                '$familyName'
                            ]
                        }
                    }
                }
            ]
        });
        schemaLoader.setModelDefinition(model);
        const items = await context.model('Person').silent().take(25).getItems();
        expect(items).toBeTruthy();
        for (const item of items) {
            expect(item.fullName).toBeTruthy();
            expect(item.fullName).toEqual(''.concat(item.givenName, ' ', item.familyName))
        }
    });

    it('should use nested readonly fields', async () => {
        /**
         * @type {import('@themost/data').SchemaLoaderStrategy}
         */
        const schemaLoader = context.getConfiguration().getStrategy(SchemaLoaderStrategy)
        /**
         * @type {import('@themost/data').DataModel}
         */
        const model = schemaLoader.getModelDefinition('Order');
        model.version = '2.5';
        model.fields.push({
            '@id': 'http://schema.org/customerDescription',
            'name': 'customerDescription',
            'readonly': true,
            'insertable': false,
            'editable': false,
            'type': 'Text',
            'query': [
                {
                    '$lookup': {
                      'from': 'Person',
                      'localField': 'customer',
                      'foreignField': 'id',
                      'as': 'customer'
                    }
                },
                {
                    '$project': {
                        'customerDescription': '$customer.description'
                    }
                }
            ]
        });
        schemaLoader.setModelDefinition(model);
        const items = await context.model('Order').silent().take(25).getItems();
        expect(items).toBeTruthy();
        for (const item of items) {
            expect(item.customerDescription).toBeTruthy();
        }
    });

});