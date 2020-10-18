import { NetInfo } from '../src/';

describe(`netinfo`, () => {
    const onlineGetter = jest.spyOn(window.navigator, 'onLine', 'get');
    let online;
    const jestHandler = jest.fn(({ isConnected }) => {
        online = isConnected;
    });
    const handler = (props): any => {
        online = props.isConnected;
    };
    const connectionTrue = {
        type: 'unknown',
        isConnected: true,
        isInternetReachable: true,
        details: {
            effectiveType: 'unknown',
        },
    };
    const connectionFalse = {
        type: 'unknown',
        isConnected: false,
        isInternetReachable: false,
        details: {
            effectiveType: 'unknown',
        },
    };
    describe('NetInfo.isConnected', () => {
        beforeEach(async () => {
            jest.resetAllMocks();
            online = undefined;
        });
        it('fetch online', async () => {
            onlineGetter.mockReturnValue(true);
            const { isConnected } = await NetInfo.fetch();
            expect(isConnected).toBeTruthy();
        });
        it('fetch offline', async () => {
            onlineGetter.mockReturnValue(false);
            const { isConnected } = await NetInfo.fetch();
            expect(isConnected).not.toBeTruthy();
        });
        it('event listener online', () => {
            const dispose = NetInfo.addEventListener(handler);
            const disposeJest = NetInfo.addEventListener(jestHandler);

            onlineGetter.mockReturnValue(true);
            window.dispatchEvent(new Event('online'));
            expect(jestHandler).toHaveBeenCalledTimes(1);
            expect(online).toBeTruthy();
            online = undefined;
            dispose();
            disposeJest();
            onlineGetter.mockReturnValue(true);
            window.dispatchEvent(new Event('online'));
            expect(jestHandler).toHaveBeenCalledTimes(1);
            expect(online).toBeUndefined();
        });

        it('event listener offline', () => {
            const dispose = NetInfo.addEventListener(handler);
            const disposeJest = NetInfo.addEventListener(jestHandler);

            onlineGetter.mockReturnValue(false);
            window.dispatchEvent(new Event('offline'));
            expect(jestHandler).toHaveBeenCalledTimes(1);
            expect(online).not.toBeTruthy();
            online = undefined;
            dispose();
            disposeJest();
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
            onlineGetter.mockReturnValue(true);
            const connInfo = await NetInfo.fetch();
            expect(connInfo).toEqual(connectionTrue);
        });
        it('fetch offline', async () => {
            onlineGetter.mockReturnValue(false);
            const connInfo = await NetInfo.fetch();
            expect(connInfo).toEqual(connectionFalse);
        });
    });
});
