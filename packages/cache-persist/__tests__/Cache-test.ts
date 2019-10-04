import { default as Cache } from '../src/Cache';
import { ICache } from '../src/CacheTypes';
import createStorage from '../src/createStorage';
import prefixLayer from '../src/layers/prefixLayer';

jest.mock('../src/createStorage', () => require.requireActual('../__mocks__/createStorage').default);

const INITIAL_STATE = { restore: true, data: 1 };
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function createStorageCalled(type): any {
    return {
        multiRemove: jest.fn(() => Promise.resolve()),
        multiGet: jest.fn(() => Promise.resolve([])),
        multiSet: jest.fn(() => Promise.resolve()),
        getAllKeys: jest.fn(() => Promise.resolve([])),
        setItem: jest.fn(() => Promise.resolve()),
        removeItem: jest.fn(() => Promise.resolve()),
        getItem: jest.fn(() => Promise.resolve()),
    };
}
/*
describe('Test speed', () => {
    const arr1 = Array.from(Array(100000), (x, i) => i + 1);
    const arr2 = Array.from(Array(100000), (x, i) => i - 1);
    const set1 = new Set(arr1.splice(0));

    it('naive 2', () => {
        const start = Date.now();
        const a = arr1;
        const arr1Length = arr1.length;
        const arr2Length = arr2.length;

        a.length = arr1Length + arr2Length;

        for (var i = 0; i < arr2Length; i++) {
            a[arr1Length + i] = arr2[i];
        }
        Array.from(new Set(a.splice(0)));
        console.log('time Set for', Date.now() - start);
    });

    it('push for', () => {
        const start = Date.now();
        const a = arr1;

        for (var l = 0; l < arr2.length; l++) {
            a.push(arr2[l]);
        }

        Array.from(new Set(a.splice(0)));
        console.log('time push for', Date.now() - start);
    });

    it('push ...', () => {
        const start = Date.now();
        const a = arr1;

        a.push(...arr2);

        Array.from(new Set(a.splice(0)));
        console.log('time push ...', Date.now() - start);
    });

    it('concat', () => {
        const start = Date.now();
        const a = arr1.concat(arr2);

        Array.from(new Set(a.splice(0)));
        console.log('time concat', Date.now() - start);
    });

    it('Set for', () => {
        const start = Date.now();
        const a = set1;

        for (var l = 0; l < arr2.length; l++) {
            a.add(arr2[l]);
        }
        Array.from(a.values());
        a.clear();
        console.log('time Set for', Date.now() - start);
    });
});

*/
describe('Cache ', () => {
    let cache: ICache;
    const start = Date.now();
    beforeAll(() => {
        cache = new Cache();
    });

    it('cache restored', async () => {
        expect(cache.isRehydrated()).not.toBeTruthy();
        await cache.restore();
        expect(cache.isRehydrated()).toBeTruthy();
    });
    it('cache set', async () => {
        cache.set('prova', 1);
        expect(cache.get('prova')).toBe(1);
    });
    it('cache remove', async () => {
        cache.remove('prova');
        expect(cache.get('prova')).toBeUndefined();
    });
    it('cache purge', async () => {
        expect(cache.getState()).toEqual(INITIAL_STATE);
        cache.purge();
        expect(cache.getState()).toEqual({});
    });
    it('cache remove', () => {
        cache.set('prova', 2);
    });
    it('cache flush', () => {
        cache.flush().then(() => {
            expect(cache.get('prova')).toBe(2);
            console.log('cache flush', Date.now() - start);
        });
    });
});

describe('Cache layers', () => {
    let cache: ICache;
    const storage: any = createStorage(null);
    beforeAll(() => {
        cache = new Cache({ storage, mutateKeys: [prefixLayer('test')] });
    });

    it('cache restored', async () => {
        expect(cache.isRehydrated()).not.toBeTruthy();
        await cache.restore();
        expect(cache.isRehydrated()).toBeTruthy();
    });
    it('cache set', async () => {
        cache.set('prova', 1);
        expect(cache.get('prova')).toBe(1);
        await cache.flush();
    });
    it('cache restored', async () => {
        cache = new Cache({ storage, mutateKeys: [prefixLayer('test')] });
        expect(cache.isRehydrated()).not.toBeTruthy();
        await cache.restore();
        console.log('storage', storage.getState());
        expect(cache.isRehydrated()).toBeTruthy();
        expect(cache.getState()).toEqual({ prova: 1 });
    });
    it('cache remove', async () => {
        cache.remove('prova');
        expect(cache.get('prova')).toBeUndefined();
        await cache.flush();
    });
    it('cache restored', async () => {
        cache = new Cache({ storage, mutateKeys: [prefixLayer('test')] });
        expect(cache.isRehydrated()).not.toBeTruthy();
        await cache.restore();
        expect(cache.isRehydrated()).toBeTruthy();
        expect(cache.getState()).toEqual({});
    });
});

describe('Cache disable persist', () => {
    let cache;
    beforeAll(() => {
        cache = new Cache({ disablePersist: true });
    });

    it('cache isRehydrated without restore', () => {
        expect(cache.isRehydrated()).toBeTruthy();
    });
    it('cache restored', async () => {
        await cache.restore();
        expect(cache.isRehydrated()).toBeTruthy();
    });
    it('cache set', () => {
        cache.set('prova', 1);
        expect(cache.get('prova')).toBe(1);
        cache.set('restore', true);
        expect(cache.get('restore')).toBeTruthy();
    });
    it('cache remove', () => {
        cache.remove('prova');
        expect(cache.get('prova')).toBeUndefined();
    });
    it('cache purge', () => {
        expect(cache.getState()).toEqual({ restore: true });
        cache.purge(true);
        expect(cache.getState()).toEqual({});
    });

    it('cache replace', () => {
        expect(cache.getState()).toEqual({});
        cache.replace(INITIAL_STATE, true);
        expect(cache.getState()).toEqual(INITIAL_STATE);
    });
    it('cache flush', async () => {
        await cache.flush();
        expect(cache.getState()).toEqual(INITIAL_STATE);
    });
});

describe('storage', () => {
    let cache;
    let storage;
    beforeAll(() => {
        storage = createStorage(undefined);
        cache = new Cache({ storage });
    });

    it('cache restored', async () => {
        expect(cache.isRehydrated()).not.toBeTruthy();
        await cache.restore();
        expect(cache.isRehydrated()).toBeTruthy();
        expect(cache.getState()).toEqual(INITIAL_STATE);
    });
    it('storage', async () => {
        cache.set('prova', 1);
        expect(cache.get('prova')).toBe(1);
        await cache.flush();
        await storage.getAllKeys().then((keys) => expect(keys.length).toBe(3));
        await storage.getItem('cache.prova').then((value) => expect(value).toBe('1'));
    });
});

describe('Cache, others', () => {
    it('cache debounce', async () => {
        const storage = createStorageCalled(undefined);
        const cache = new Cache({ storage });
        await cache.restore();
        Array.from(Array(10000).keys()).forEach((index) => {
            cache.set(`prova${index}`, index);
        });
        Array.from(Array(3500).keys()).forEach((index) => {
            cache.remove(`prova${index}`);
        });
        await sleep(600);
        //jest.runOnlyPendingTimers();
        expect(storage.multiRemove).toHaveBeenCalledTimes(1);
        expect(storage.multiSet).toHaveBeenCalledTimes(1);
        Array.from(Array(20).keys()).forEach((index) => {
            cache.set(`prova${index}`, index);
        });
        Array.from(Array(20).keys()).forEach((index) => {
            cache.remove(`prova${index}`);
        });
        await sleep(600);
        expect(storage.multiRemove).toHaveBeenCalledTimes(2);
        Array.from(Array(20).keys()).forEach((index) => {
            cache.set(`prova${index}`, index);
        });
        Array.from(Array(20).keys()).forEach((index) => {
            cache.delete(`prova${index}`);
        });
        await sleep(600);
        expect(storage.multiSet).toHaveBeenCalledTimes(2);
        Array.from(Array(20).keys()).forEach((index) => {
            cache.set(`prova${index}`, index);
        });
        Array.from(Array(20).keys()).forEach((index) => {
            cache.remove(`prova${index}`);
        });
        Array.from(Array(20).keys()).forEach((index) => {
            cache.set(`prova${index}`, index);
        });
        await sleep(600);
        expect(storage.multiSet).toHaveBeenCalledTimes(3);
        expect(storage.setItem).toHaveBeenCalledTimes(0);
        expect(storage.removeItem).toHaveBeenCalledTimes(0);
        //jest.runTimersToTime(2000);
    });

    it('cache debounce with await', async () => {
        const storage = createStorageCalled(undefined);
        const cache = new Cache({ storage });
        await cache.restore();
        console.log('cache debounce with await start');
        const startTime = Date.now();
        Array.from(Array(10000).keys()).forEach((index) => {
            cache.set(`prova${index}`, index);
        });
        console.log('cache debounce 1', Date.now() - startTime);
        Array.from(Array(3500).keys()).forEach((index) => {
            cache.remove(`prova${index}`);
        });
        console.log('cache debounce 2', Date.now() - startTime);
        Array.from(Array(20).keys()).forEach((index) => {
            cache.set(`prova${index}`, index);
        });
        Array.from(Array(20).keys()).forEach((index) => {
            cache.remove(`prova${index}`);
        });
        Array.from(Array(20).keys()).forEach((index) => {
            cache.set(`prova${index}`, index);
        });
        Array.from(Array(20).keys()).forEach((index) => {
            cache.delete(`prova${index}`);
        });
        Array.from(Array(20).keys()).forEach((index) => {
            cache.set(`prova${index}`, index);
        });
        Array.from(Array(20).keys()).forEach((index) => {
            cache.remove(`prova${index}`);
        });
        Array.from(Array(20).keys()).forEach((index) => {
            cache.set(`prova${index}`, index);
        });
        cache.set('end', 2);
        console.log('cache debounce 3', Date.now() - startTime);
        await cache.flush();
        console.log('cache debounce end', Date.now() - startTime);
        expect(storage.multiSet).toHaveBeenCalledTimes(1);
        expect(storage.multiRemove).toHaveBeenCalledTimes(1);
        expect(storage.setItem).toHaveBeenCalledTimes(0);
        expect(storage.removeItem).toHaveBeenCalledTimes(0);
        //jest.runTimersToTime(2000);
    });

    it('cache callback', async () => {
        const cache = new Cache();
        await cache.restore();
        const callback = jest.fn();
        const dispose = cache.subscribe(callback);
        cache.notify();
        expect(callback).toHaveBeenCalledTimes(1);
        cache.notify();
        expect(callback).toHaveBeenCalledTimes(2);
        dispose();
        cache.notify();
        expect(callback).toHaveBeenCalledTimes(2);
    });

    it('cache flush', async () => {
        console.log('cache flush start');
        const startTime = Date.now();
        const cache = new Cache();
        await cache.restore();
        console.log('cache flush 1', Date.now() - startTime);
        Array.from(Array(10000).keys()).forEach((index) => {
            cache.set(`prova${index}`, index);
        });
        cache.flush().then(() => console.log('cache flush 2', Date.now() - startTime));
        cache.set('prova', 2);
        await cache.flush();
        console.log('cache flush 3', Date.now() - startTime);
        expect(cache.get('prova')).toBe(2);
    });
});
