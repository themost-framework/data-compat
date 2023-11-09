import '@themost/data-compat/register';
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

    it('should register polyfills', () => {
        //
    });
});