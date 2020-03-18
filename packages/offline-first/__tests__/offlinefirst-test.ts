import OfflineFirst from '../src';

function createPersistedStorage(clientState = {}) {
    const state = {};
    Object.keys(clientState).forEach((key) => (state['offline-first.' + key] = JSON.stringify(clientState[key])));
    return {
        getAllKeys: () => Promise.resolve(Object.keys(state)),
        setItem: (key, value) => Promise.resolve((state[key] = value)),
        removeItem: (key) => Promise.resolve(delete state[key]),
        getItem: (key) => Promise.resolve(state[key]),
        getState: () => state,
    } as any;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

describe(`offline-first`, () => {
    let storeOffline: OfflineFirst<any>;
    describe('Offline-first', () => {
        let onlineGetter;
        describe('hydrate', () => {
            it('online', async () => {
                const persistOptionsStoreOffline = {
                    storage: createPersistedStorage(),
                };
                storeOffline = new OfflineFirst(persistOptionsStoreOffline);
                expect(storeOffline.isOnline()).not.toBeTruthy();
                await storeOffline.hydrate();
                expect(storeOffline.isOnline()).toBeTruthy();
            });
        });

        describe('offline-options start, finish, publish, onPublish', () => {
            let execute;
            let start;
            let finish;
            let onPublish;
            beforeEach(async () => {
                execute = jest.fn((_offlineRecord) => {});
                start = jest.fn((_mutations) => Promise.resolve(_mutations));
                finish = jest.fn((_mutations, _error) => Promise.resolve(undefined));
                onPublish = jest.fn((offlineRecord) => Promise.resolve(offlineRecord));
            });

            it('start/finish called when online', async () => {
                const persistOptionsStoreOffline = {
                    storage: createPersistedStorage(),
                };
                const offlineOptions = {
                    start,
                    execute,
                    finish,
                } as any;
                storeOffline = new OfflineFirst<any>(persistOptionsStoreOffline);
                storeOffline.setOfflineOptions(offlineOptions);

                expect(start).toHaveBeenCalledTimes(0);
                expect(finish).toHaveBeenCalledTimes(0);
                await storeOffline.hydrate();
                expect(start).toHaveBeenCalledTimes(1);
                expect(finish).toHaveBeenCalledTimes(1);
            });
            it('start/finish not called when offline', async () => {
                const persistOptionsStoreOffline = {
                    storage: createPersistedStorage(),
                };
                const offlineOptions = {
                    start,
                    execute,
                    finish,
                } as any;
                storeOffline = new OfflineFirst<any>(persistOptionsStoreOffline);
                storeOffline.setOfflineOptions(offlineOptions);
                onlineGetter = jest.spyOn(window.navigator, 'onLine', 'get');
                onlineGetter.mockReturnValue(false);

                expect(start).toHaveBeenCalledTimes(0);
                expect(finish).toHaveBeenCalledTimes(0);
                await storeOffline.hydrate();
                expect(start).toHaveBeenCalledTimes(0);
                expect(finish).toHaveBeenCalledTimes(0);
            });
            it('publish', async () => {
                const persistOptionsStoreOffline = {
                    storage: createPersistedStorage(),
                };
                const offlineOptions = {
                    start,
                    execute,
                    onPublish,
                } as any;
                storeOffline = new OfflineFirst<any>(persistOptionsStoreOffline);
                storeOffline.setOfflineOptions(offlineOptions);
                await storeOffline.hydrate();
                expect(onPublish).toHaveBeenCalledTimes(0);
                const request = {
                    payload: '/api/vi/test',
                };
                await storeOffline.publish({
                    request,
                });
                expect(onPublish).toHaveBeenCalledTimes(1);
                expect(storeOffline.getListMutation().length).toEqual(1);
                expect(storeOffline.getListMutation()[0].request).toEqual(request);
            });
        });

        describe('offline-options onComplete, onExecute, onDiscard', () => {
            let execute;
            let onExecute;
            let onComplete;
            let onDiscard;
            let executeReject;
            let start;
            beforeEach(async () => {
                start = jest.fn((_mutations) => Promise.resolve(_mutations));
                execute = jest.fn((_offlineRecord) => Promise.resolve(_offlineRecord));
                onExecute = jest.fn((mutation) => Promise.resolve(mutation));
                executeReject = jest.fn((_offlineRecord) => Promise.reject(_offlineRecord));
                onComplete = jest.fn((_options) => Promise.resolve(true));
                onDiscard = jest.fn((_options) => Promise.resolve(true));
            });

            it('onExecute onComplete', async () => {
                const persistOptionsStoreOffline = {
                    storage: createPersistedStorage(),
                };
                const offlineOptions = {
                    start,
                    execute,
                    onExecute,
                    onComplete,
                } as any;
                storeOffline = new OfflineFirst<any>(persistOptionsStoreOffline);
                storeOffline.setOfflineOptions(offlineOptions);
                onlineGetter = jest.spyOn(window.navigator, 'onLine', 'get');
                onlineGetter.mockReturnValue(false);
                await storeOffline.hydrate();
                expect(storeOffline.isOnline()).not.toBeTruthy();
                const request = {
                    payload: '/api/vi/test',
                };
                await storeOffline.publish({
                    request,
                });
                expect(storeOffline.getListMutation().length).toEqual(1);
                expect(storeOffline.getListMutation()[0].request).toEqual(request);
                expect(onExecute).toHaveBeenCalledTimes(0);
                expect(onComplete).toHaveBeenCalledTimes(0);
                window.dispatchEvent(new Event('online'));
                expect(storeOffline.isOnline()).toBeTruthy();
                await sleep(100);
                expect(start).toHaveBeenCalledTimes(1);
                expect(onExecute).toHaveBeenCalledTimes(1);
                expect(onComplete).toHaveBeenCalledTimes(1);
                expect(storeOffline.getListMutation().length).toEqual(0);
            });

            it('onExecute onDiscard', async () => {
                const persistOptionsStoreOffline = {
                    storage: createPersistedStorage(),
                };
                const offlineOptions = {
                    start,
                    execute: executeReject,
                    onDiscard,
                } as any;
                storeOffline = new OfflineFirst<any>(persistOptionsStoreOffline);
                storeOffline.setOfflineOptions(offlineOptions);
                onlineGetter = jest.spyOn(window.navigator, 'onLine', 'get');
                onlineGetter.mockReturnValue(false);
                await storeOffline.hydrate();
                expect(storeOffline.isOnline()).not.toBeTruthy();
                const request = {
                    payload: '/api/vi/test',
                };
                await storeOffline.publish({
                    request,
                });
                expect(storeOffline.getListMutation().length).toEqual(1);
                expect(storeOffline.getListMutation()[0].request).toEqual(request);
                expect(onExecute).toHaveBeenCalledTimes(0);
                expect(onDiscard).toHaveBeenCalledTimes(0);
                window.dispatchEvent(new Event('online'));
                expect(storeOffline.isOnline()).toBeTruthy();
                await sleep(100);
                expect(start).toHaveBeenCalledTimes(1);
                expect(onComplete).toHaveBeenCalledTimes(0);
                expect(onDiscard).toHaveBeenCalledTimes(1);
                expect(storeOffline.getListMutation().length).toEqual(0);
            });
        });
    });
});
