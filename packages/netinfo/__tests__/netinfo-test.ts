import { NetInfo } from '../src/';

describe(`netinfo`, () => {
    let onlineGetter;
    let online;
    const jestHandler = jest.fn((isOnline) => {
        online = isOnline;
    });
    const handler = (isOnline) => {
        online = isOnline;
    };
    const connectionTrue = { effectiveType: 'unknown', type: 'unknown', isConnected: true };
    const connectionFalse = { effectiveType: 'unknown', type: 'unknown', isConnected: false };
    describe('NetInfo.isConnected', () => {
        beforeEach(async () => {
            jest.resetAllMocks();
            online = undefined;
        });
        it('fetch online', async () => {
            const isConnected = await NetInfo.isConnected.fetch();
            expect(isConnected).toBeTruthy();
        });
        it('fetch offline', async () => {
            onlineGetter = jest.spyOn(window.navigator, 'onLine', 'get');

            onlineGetter.mockReturnValue(false);
            const isConnected = await NetInfo.isConnected.fetch();
            expect(isConnected).not.toBeTruthy();
        });
        it('event listener online', () => {
            const dispose = NetInfo.isConnected.addEventListener('change', handler);
            const disposeJest = NetInfo.isConnected.addEventListener('change', jestHandler);

            window.dispatchEvent(new Event('online'));
            expect(jestHandler).toHaveBeenCalledTimes(1);
            expect(online).toBeTruthy();
            online = undefined;
            dispose.remove();
            disposeJest.remove();
            window.dispatchEvent(new Event('online'));
            expect(jestHandler).toHaveBeenCalledTimes(1);
            expect(online).toBeUndefined();
        });

        it('event listener offline', () => {
            const dispose = NetInfo.isConnected.addEventListener('change', handler);
            const disposeJest = NetInfo.isConnected.addEventListener('change', jestHandler);

            window.dispatchEvent(new Event('offline'));
            expect(jestHandler).toHaveBeenCalledTimes(1);
            expect(online).not.toBeTruthy();
            online = undefined;
            dispose.remove();
            disposeJest.remove();
            window.dispatchEvent(new Event('offline'));
            expect(jestHandler).toHaveBeenCalledTimes(1);
            expect(online).toBeUndefined();
        });
    });

    describe('NetInfo', () => {
        beforeEach(async () => {
            jest.resetAllMocks();
            online = undefined;
        });
        it('fetch online', async () => {
            onlineGetter = jest.spyOn(window.navigator, 'onLine', 'get');
            onlineGetter.mockReturnValue(true);
            const connInfo = await NetInfo.fetch();
            expect(connInfo).toEqual(connectionTrue);
        });
        it('fetch offline', async () => {
            onlineGetter = jest.spyOn(window.navigator, 'onLine', 'get');

            onlineGetter.mockReturnValue(false);
            const connInfo = await NetInfo.fetch();
            expect(connInfo).toEqual(connectionFalse);
        });
    });
});
