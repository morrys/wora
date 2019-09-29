import { default as Cache } from '../src/Cache';
import { ICache } from '../src/CacheTypes';
import createStorage from '../src/createStorage';
import prefixLayer from '../src/layers/prefixLayer';

jest.mock('../src/createStorage', () => require.requireActual('../__mocks__/createStorage').default);

const INITIAL_STATE = { restore: true, cavolo: 1 };
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/*describe('Cache promises', () => {
    let cache;
    beforeAll(() => {
        cache = new Cache();
    });

    it('cache set', async () => {
        await cache.set("prova2", 1, true);
        await sleep(600);
        expect(cache.get("prova2")).toBe(1);
        cache.set("prova3", 1);
        await sleep(600);
    })
});
*/
describe('Cache promises', () => {
    let cache;
    beforeAll(() => {
        cache = new Cache();
    });

    it('cache restored', async () => {
        expect(cache.isRehydrated()).not.toBeTruthy();
        await cache.restore();
        expect(cache.isRehydrated()).toBeTruthy();
    }),
        it('cache set', async () => {
            await cache.set('prova', 1, true);
            expect(cache.get('prova')).toBe(1);
        }),
        it('cache remove', async () => {
            await cache.remove('prova', true);
            expect(cache.get('prova')).toBeUndefined();
        }),
        it('cache purge', async () => {
            expect(cache.getState()).toEqual(INITIAL_STATE);
            await cache.purge();
            expect(cache.getState()).toEqual({});
        }),
        it('cache remove promise', () => {
            cache.set('prova', 2, true).then(() => {
                expect(cache.get('prova')).toBe(2);
            });
        });
});

/*
describe('Cache promises layers', () => {
    let cache;
    const storage: any = createStorage(null);
    beforeAll(() => {
        cache = new Cache({ storage, layers: [prefixLayer('test')] });
    });

    it('cache restored', async () => {
        expect(cache.isRehydrated()).not.toBeTruthy();
        await cache.restore();
        expect(cache.isRehydrated()).toBeTruthy();
    }),
        it('cache set', async () => {
            await cache.set('prova', 1, true);
            expect(cache.get('prova')).toBe(1);
        }),
        it('cache restored', async () => {
            cache = new Cache({ storage, layers: [prefixLayer('test')] });
            expect(cache.isRehydrated()).not.toBeTruthy();
            await cache.restore();
            console.log('storage', storage.getState());
            expect(cache.isRehydrated()).toBeTruthy();
            expect(cache.getState()).toEqual({ prova: 1 });
        }),
        it('cache remove', async () => {
            await cache.remove('prova', true);
            expect(cache.get('prova')).toBeUndefined();
        }),
        it('cache restored', async () => {
            cache = new Cache({ storage, layers: [prefixLayer('test')] });
            expect(cache.isRehydrated()).not.toBeTruthy();
            await cache.restore();
            expect(cache.isRehydrated()).toBeTruthy();
            expect(cache.getState()).toEqual({});
        });
});

describe('Cache', () => {
    let cache: ICache;
    beforeAll(() => {
        cache = new Cache();
    });

    it('cache restored', async () => {
        expect(cache.isRehydrated()).not.toBeTruthy();
        await cache.restore();
        expect(cache.isRehydrated()).toBeTruthy();
    }),
        it('cache set', () => {
            cache.set('prova', 1);
            expect(cache.get('prova')).toBe(1);
        }),
        it('cache remove', () => {
            cache.remove('prova');
            expect(cache.get('prova')).toBeUndefined();
        }),
        // change in order to use debounce?
        it('cache purge', async () => {
            expect(cache.getState()).toEqual(INITIAL_STATE);
            await cache.purge();
            expect(cache.getState()).toEqual({});
        });
});

describe('Cache promises disable persist', () => {
    let cache;
    beforeAll(() => {
        cache = new Cache({ disablePersist: true });
    });

    it('cache isRehydrated without restore', () => {
        expect(cache.isRehydrated()).toBeTruthy();
    }),
        it('cache set', async () => {
            await cache.set('prova', 1, true);
            expect(cache.get('prova')).toBe(1);
            await cache.set('restore', true, true);
            expect(cache.get('restore')).toBeTruthy();
        }),
        it('cache remove', async () => {
            await cache.remove('prova', true);
            expect(cache.get('prova')).toBeUndefined();
        }),
        it('cache purge', async () => {
            expect(cache.getState()).toEqual({ restore: true });
            await cache.purge();
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
    }),
        it('cache restored', async () => {
            await cache.restore();
            expect(cache.isRehydrated()).toBeTruthy();
        }),
        it('cache set', () => {
            cache.set('prova', 1);
            expect(cache.get('prova')).toBe(1);
            cache.set('restore', true);
            expect(cache.get('restore')).toBeTruthy();
        }),
        it('cache remove', () => {
            cache.remove('prova');
            expect(cache.get('prova')).toBeUndefined();
        }),
        // change in order to use debounce?
        it('cache purge', async () => {
            expect(cache.getState()).toEqual({ restore: true });
            await cache.purge();
            expect(cache.getState()).toEqual({});
        });

    it('cache replace', async () => {
        expect(cache.getState()).toEqual({});
        await cache.replace(INITIAL_STATE);
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
    }),
        it('storage', async () => {
            await cache.set('prova', 1, true);
            expect(cache.get('prova')).toBe(1);

            await storage.getAllKeys().then((keys) => expect(keys.length).toBe(3));
            await storage.getItem('cache.prova').then((value) => expect(value).toBe('1'));
        });
});
describe('Cache, others', () => {
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
    }),
        it('cache debounce with await', async () => {
            const storage = createStorageCalled(undefined);
            const cache = new Cache({ storage });
            await cache.restore();
            console.log('cache debounce with await start');
            const startTime = Date.now();
            Array.from(Array(10000).keys()).forEach((index) => {
                cache.set(`prova${index}`, index);
            });
            Array.from(Array(3500).keys()).forEach((index) => {
                cache.remove(`prova${index}`);
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
            await cache.set('end', 2, true);
            const endTime = Date.now();
            console.log('cache debounce with await end', endTime - startTime);
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
});
*/
