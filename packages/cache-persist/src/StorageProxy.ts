import jsonSerialize from './layers/jsonSerialize';
import prefixLayer from './layers/prefixLayer';
import { ICache, IStorageHelper, DataCache, ICacheStorage, IMutateValue, IMutateKey, CacheOptions } from './CacheTypes';
import compose from './utils/compose';
import createStorage from './createStorage';

export function promiseResult<T>(execute: () => T): Promise<T> {
    return Promise.resolve(execute());
}

export function promiseVoid(execute = (): void => undefined): Promise<void> {
    return promiseResult(execute);
}

const SPLIT = '####';

const NoStorageProxy: IStorageHelper = {
    restore: () => {
        return promiseResult(() => {
            return {};
        });
    },
    push: (_keys: string) => undefined,
    flush: () => promiseVoid(),
    getStorage: () => undefined,
};

function StorageProxy(cache: ICache, options: CacheOptions = {}): IStorageHelper {
    const {
        prefix = 'cache',
        serialize = true,
        webStorage = 'local',
        mutateKeys = [],
        mutateValues = [],
        errorHandling = (_cache, _error): boolean => true,
        throttle = 500,
        disablePersist = false,
        storage = createStorage(webStorage),
    } = options;
    const disable = disablePersist || !storage;
    if (disable) {
        return NoStorageProxy;
    }
    let timerId = null;
    let inExecution = false;
    let resolveFlush;
    let rejectFlush;
    let promiseFlush: Promise<void>;
    const queue: Array<string> = [];
    if (prefix) {
        mutateKeys.unshift(prefixLayer(prefix));
    }
    if (serialize) {
        mutateValues.push(jsonSerialize);
    }
    const mutateValue: IMutateValue = {
        set: compose(...mutateValues.map((mutate) => mutate.set)),
        get: compose(
            ...mutateValues
                .slice()
                .reverse()
                .map((mutate) => mutate.get),
        ),
    };
    const mutateKey: IMutateKey = {
        set: compose(...mutateKeys.map((mutate) => (key): string => (key != null ? mutate.set(key) : null))),
        get: compose(
            ...mutateKeys
                .slice()
                .reverse()
                .map((mutate) => (key): string => (key != null ? mutate.get(key) : null)),
        ),
    };
    const internalStorage = {
        multiRemove: (keys): Promise<void> => {
            const promises: Array<Promise<void>> = [];
            for (let i = 0, l = keys.length; i < l; i++) {
                promises.push(storage.removeItem(keys[i]));
            }
            return Promise.all(promises)
                .then(() => undefined)
                .catch((error) => {
                    throw error;
                });
        },
        multiGet: (keys) => {
            const promises: Array<Promise<Array<string>>> = [];
            for (let i = 0, l = keys.length; i < l; i++) {
                const key: string = keys[i];
                promises.push(
                    storage
                        .getItem(key)
                        .then((value) => [key, value])
                        .catch((error) => {
                            throw error;
                        }),
                );
            }
            return Promise.all(promises);
        },
        multiSet: (items: Array<Array<string>>) => {
            const promises: Array<Promise<void>> = [];
            for (let i = 0, l = items.length; i < l; i++) {
                const [key, value] = items[i];
                promises.push(storage.setItem(key, value));
            }
            return Promise.all(promises)
                .then(() => undefined)
                .catch((error) => {
                    throw error;
                });
        },
        ...storage,
    } as ICacheStorage;

    function restore(): Promise<DataCache> {
        return internalStorage
            .getAllKeys()
            .then((keys: Array<string>) => internalStorage.multiGet(keys.filter((key) => !!mutateKey.get(key))))
            .then((data) => {
                const result: DataCache = {};
                for (let i = 0, l = data.length; i < l; i++) {
                    const [key, value] = data[i];
                    const keyMutate = mutateKey.get(key);
                    const valueMutate = mutateValue.get(value);
                    result[keyMutate] = valueMutate;
                }
                return result;
            });
    }

    function push(key: string): void {
        /*if (!execution && queue.length === 0) {
            start();
        }*/
        const newKey = mutateKey.set(key);
        if (newKey) {
            queue.push(`${key}${SPLIT}${newKey}`);
            debounced();
        }
    }

    function flush(): Promise<void> {
        if (queue.length === 0) {
            return Promise.resolve();
        }
        if (!inExecution) {
            cancelTimer();
            return execute();
        }
        if (!promiseFlush) {
            promiseFlush = new Promise((resolve, reject): void => {
                rejectFlush = reject;
                resolveFlush = resolve;
            });
            debounced(); //
        }
        return promiseFlush;
    }

    function timerExpired(): void {
        if (!inExecution) {
            execute();
        }
        setNextTimer(); // maybe it is not needed, evalute check on queue
    }

    function cancelTimer(): void {
        if (!timerId) return;
        clearTimeout(timerId);
        timerId = null;
    }

    function setNextTimer(): void {
        cancelTimer();
        timerId = setTimeout(timerExpired, throttle);
    }

    function debounced(): void {
        if (!timerId) {
            setNextTimer();
        }
    }

    function execute(): Promise<void> {
        inExecution = true;
        //next();
        const flushKeys = Array.from(new Set(queue.splice(0)));
        // this allows to resolve only the promises registered before the execution
        const resolve = resolveFlush;
        const reject = rejectFlush;
        resolveFlush = null;
        rejectFlush = null;
        promiseFlush = null;
        const dispose = function(error?: Error): void {
            if (error) {
                if (reject) {
                    reject();
                }
                errorHandling(cache, error);
            } else {
                if (resolve) {
                    resolve();
                }
            }
            cancelTimer();

            inExecution = false;
            if (queue.length > 0) {
                debounced();
            }
        };
        const removeKeys = [];
        const setValues = [];
        for (let i = 0, l = flushKeys.length; i < l; i++) {
            const [key, newKey] = flushKeys[i].split(SPLIT);
            if (cache.has(key)) {
                setValues.push([newKey, mutateValue.set(cache.get(key))]);
            } else {
                removeKeys.push(newKey);
            }
        }

        const promises = [];
        if (removeKeys.length > 0) {
            // TODO length === 1 remove
            promises.push(internalStorage.multiRemove(removeKeys));
        }
        if (setValues.length > 0) {
            // TODO length === 1 set
            promises.push(internalStorage.multiSet(setValues));
        }
        return Promise.all(promises)
            .then(() => dispose())
            .catch((error) => dispose(error));
    }

    return {
        push,
        restore,
        flush,
        getStorage: () => internalStorage,
    } as IStorageHelper;
}

export default StorageProxy;
