import jsonSerialize from './layers/jsonSerialize';
import prefixLayer from './layers/prefixLayer';
import { ICache, IStorageHelper, DataCache, ICacheStorage, ILayer, StorageHelperOptions } from './CacheTypes';
import Queue from './Queue';

export function promiseResult<T>(execute: () => T): Promise<T> {
    return Promise.resolve(execute());
}

export function promiseVoid(execute = (): void => undefined): Promise<void> {
    return promiseResult(execute);
}

class StorageProxy implements IStorageHelper {
    private storage: ICacheStorage;
    private layers: Array<ILayer> = [];
    private checks: Array<ILayer>;
    private gets: Array<ILayer>;
    private sets: Array<ILayer>;
    private removes: Array<ILayer>;
    private cache: ICache;
    private queue: {
        push: {
            (key: string, promise: true): Promise<void>;
            (key: string): void;
        };
    };

    constructor(cache: ICache, storage: any, options: StorageHelperOptions = {}) {
        const { prefix, serialize, layers, errorHandling, throttle } = options;
        this.cache = cache;
        this.queue = Queue({
            throttle,
            errorHandling,
            execute: (flushKeys): Promise<any> => this.execute(flushKeys),
        });
        this.layers = prefix ? this.layers.concat(prefixLayer(prefix)) : this.layers;
        this.layers = this.layers.concat(layers);
        this.layers = serialize ? this.layers.concat(jsonSerialize) : this.layers;
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
        this.init();
    }

    public purge(): Promise<boolean> {
        return this.storage.getAllKeys().then((keys: Array<string>) =>
            this.storage
                .multiRemove(this.filter(keys))
                .then(() => true)
                .catch(() => false),
        );
    }

    public restore(): Promise<DataCache> {
        return this.storage
            .getAllKeys()
            .then((keys: Array<string>) => this.storage.multiGet(this.filter(keys)))
            .then((data) => {
                const result: DataCache = {};
                for (let i = 0, l = data.length; i < l; i++) {
                    const [key, value] = data[i];
                    const item = this.get(key, value);
                    result[item[0]] = item[1];
                }
                return result;
            });
    }

    public replace(data: any): Promise<void> {
        const items: Array<Array<string>> = [];
        return this.purge().then(
            (): Promise<void> => {
                Object.entries(data).forEach(([key, value]) => {
                    const item = this.set(key, value);
                    if (item) {
                        items.push(item);
                    }
                });
                return this.storage.multiSet(items);
            },
        );
    }

    setItem(key: string, value: any, promise: true): Promise<void>;
    setItem(key: string, value: any): void;
    setItem(key: any, value: any, promise?: any) {
        if (promise) {
            return this.queue.push(key, promise);
        }
        this.queue.push(key);
    }

    removeItem(key: string, promise: true): Promise<void>;
    removeItem(key: string): void;
    removeItem(key: any, promise?: any) {
        if (promise) {
            return this.queue.push(key, promise);
        }
        this.queue.push(key);
    }

    public execute(flushKeys: Array<string>): Promise<any> {
        const stateKeys = this.cache.getAllKeys();
        const removeKeys = [];
        const setValues = [];
        for (let i = 0, l = flushKeys.length; i < l; i++) {
            const key = flushKeys[i];
            const isSet = stateKeys.includes(key);
            if (isSet) {
                const value = this.cache.get(key);
                const item = this.set(key, value);
                if (item) {
                    setValues.push(item);
                }
            } else {
                const keyToRemove = this.remove(key);
                if (keyToRemove) {
                    removeKeys.push(keyToRemove);
                }
            }
        }
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

    private init(): void {
        this.checks = this.layers
            .slice()
            .reverse()
            .filter((layer) => !!layer.check);
        this.sets = this.layers.filter((layer) => !!layer.set);
        this.removes = this.layers.filter((layer) => !!layer.remove);
        this.gets = this.layers
            .slice()
            .reverse()
            .filter((layer) => !!layer.get);
    }

    private filter(keys: Array<string>): Array<string> {
        return keys.filter((key) =>
            this.checks.reduce((currentValue, layer) => (!currentValue ? currentValue : layer.check(currentValue)), key),
        );
    }

    private set(key: string, value: any): Array<string> {
        return this.sets.reduce((currentValue, layer) => (!currentValue ? currentValue : layer.set(currentValue[0], currentValue[1])), [
            key,
            value,
        ]);
    }

    private get(key: string, value: any): Array<string> {
        return this.gets.reduce((currentValue, layer) => (!currentValue ? currentValue : layer.get(currentValue[0], currentValue[1])), [
            key,
            value,
        ]);
    }

    private remove(key: string): string {
        return this.removes.reduce((currentValue, layer) => (!currentValue ? currentValue : layer.remove(currentValue)), key);
    }
}

export default StorageProxy;
