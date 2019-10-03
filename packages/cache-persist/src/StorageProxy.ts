import jsonSerialize from './layers/jsonSerialize';
import prefixLayer from './layers/prefixLayer';
import { ICache, IStorageHelper, DataCache, ICacheStorage, StorageHelperOptions } from './CacheTypes';
import Queue from './Queue';
import compose from './utils/compose';

export function promiseResult<T>(execute: () => T): Promise<T> {
    return Promise.resolve(execute());
}

export function promiseVoid(execute = (): void => undefined): Promise<void> {
    return promiseResult(execute);
}

class StorageProxy implements IStorageHelper {
    private storage: ICacheStorage;
    private setKey: (key: string) => string | null;
    private getKey: (key: string) => string | null;
    private setValue: (value: any) => any;
    private getValue: (value: any) => any;
    private cache: ICache;
    private queue: {
        multiPush: (keys: Array<string>) => void;
        push: (key: string) => void;
        flush: () => Promise<void>;
    };
    constructor(cache: ICache, storage: any, options: StorageHelperOptions = {}) {
        const { prefix, serialize, mutateKeys, mutateValues, errorHandling, throttle } = options;
        this.cache = cache;
        this.queue = Queue({
            throttle,
            errorHandling,
            execute: (flushKeys): Promise<any> => this.execute(flushKeys),
        });
        if (prefix) {
            mutateKeys.unshift(prefixLayer(prefix));
        }
        if (serialize) {
            mutateValues.push(jsonSerialize);
        }
        this.getKey = compose(
            ...mutateKeys
                .slice()
                .reverse()
                .map((mutate) => mutate.get),
        );
        this.getValue = compose(
            ...mutateValues
                .slice()
                .reverse()
                .map((mutate) => mutate.get),
        );
        this.setKey = compose(...mutateKeys.map((mutate) => (key) => mutate.set(key)));
        this.setValue = compose(...mutateValues.map((mutate) => mutate.set));
        this.storage = {
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
                const promises: Array<Promise<void>> = [];
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
    }

    public restore(): Promise<DataCache> {
        return this.storage
            .getAllKeys()
            .then((keys: Array<string>) => this.storage.multiGet(keys.filter((key) => !!this.getKey(key))))
            .then((data) => {
                const result: DataCache = {};
                for (let i = 0, l = data.length; i < l; i++) {
                    const [key, value] = data[i];
                    const keyMutate = this.getKey(key);
                    const valueMutate = this.getValue(value);
                    result[keyMutate] = valueMutate;
                }
                return result;
            });
    }

    public multiPush(keys: Array<string>) {
        this.queue.multiPush(keys);
    }

    public push(key: string) {
        this.queue.push(key);
    }

    public flush(): Promise<void> {
        return this.queue.flush();
    }

    public execute(flushKeys: Array<string>): Promise<any> {
        const startTime = Date.now();
        console.log('cache debounce 5', Date.now() - startTime);
        const removeKeys = [];
        const setValues = [];
        for (let i = 0, l = flushKeys.length; i < l; i++) {
            const key = flushKeys[i];
            const isSet = this.cache.has(key);
            const mutateKey = this.setKey(key);
            if (!mutateKey) {
                continue;
            }
            if (isSet) {
                const value = this.cache.get(key);
                const item = [mutateKey, this.setValue(value)];
                setValues.push(item);
            } else {
                removeKeys.push(mutateKey);
            }
        }

        console.log('cache debounce 6', Date.now() - startTime);
        const promises = [];
        if (removeKeys.length > 0) {
            // TODO length === 1 remove
            promises.push(this.storage.multiRemove(removeKeys));
        }
        if (setValues.length > 0) {
            // TODO length === 1 set
            promises.push(this.storage.multiSet(setValues));
        }
        return Promise.all(promises);
    }
}

export default StorageProxy;
