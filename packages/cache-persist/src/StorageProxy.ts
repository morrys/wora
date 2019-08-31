import jsonSerialize from './layers/jsonSerialize';
import prefixLayer from './layers/prefixLayer';
import { StorageHelper, DataCache, CacheStorage, Layer, StorageHelperOptions } from './CacheTypes';
import Cache from './Cache';
import Queue from './Queue';

export function promiseResult<T>(execute: () => T): Promise<T> {
    return new Promise((resolve, reject) => {
        resolve(execute())
    });
}

export function promiseVoid(execute: () => void): Promise<void> {
    return new Promise((resolve, reject) => {
        execute()
        resolve()
    });
}


class StorageProxy implements StorageHelper {

    storage: CacheStorage;
    serialize: boolean;
    prefix: string;
    layers: Array<Layer> = [];
    checks: Array<Layer>;
    gets: Array<Layer>;
    sets: Array<Layer>;
    removes: Array<Layer>;
    cache: Cache;
    queue: Queue;

    constructor(cache: Cache, storage: any, options: StorageHelperOptions = {}) {
        const { prefix, serialize, layers, errorHandling } = options;
        this.cache = cache;
        this.queue = new Queue((flushKeys) => this.execute(flushKeys), errorHandling);
        this.serialize = serialize;
        this.prefix = prefix;
        this.layers = prefix ? this.layers.concat(prefixLayer(prefix)) : this.layers
        this.layers = this.layers.concat(layers);
        this.layers = serialize ? this.layers.concat(jsonSerialize) : this.layers;
        this.storage = storage;
        this.init();
    }

    init() {
        this.checks = this.layers.filter((layer => !!layer.check)); // reverse?
        this.sets = this.layers.filter((layer => !!layer.set));
        this.removes = this.layers.filter((layer => !!layer.remove));
        this.gets = this.layers.slice().reverse().filter((layer => !!layer.get));
    }

    purge(): Promise<boolean> {
        return this.storage.getAllKeys().then((keys: Array<string>) =>
            this.storage.multiRemove(this.filter(keys))
                .then(() => true)
                .catch(() => false)
        );
    }
    restore(): Promise<DataCache> {
        return this.storage.getAllKeys().then((keys: Array<string>) =>
            this.storage.multiGet(this.filter(keys))).then(data => {
                const result: DataCache = {};
                Object.entries(data).forEach(([key, value]) => {
                    const item = this.get(key, value)
                    result[item[0]] = item[1];
                });
                return result;
            });
    }
    replace(data: any): Promise<void> {
        const items: string[][] = [];
        return this.purge().then(async () => {
            Object.entries(data).forEach(([key, value]) => {
                const item = this.set(key, value);
                if (item) {
                    items.push(item);
                }

            });
            await this.storage.multiSet(items);
        })

    }

    removeItem(key: string): Promise<void> {
        return new Promise(async (resolve, reject) => {
            /*const keyToRemove = this.remove(key);
            if (keyToRemove) {
                await this.storage.removeItem(keyToRemove);
            }*/
            this.queue.push(key);
            resolve()
        })
    }

    setItem(key: string, value: any): Promise<void> {
        return new Promise(async (resolve, reject) => {
            /*const item = this.set(key, value);
            if (item) {
                await this.storage.setItem(item.key, item.value)
            }*/
            this.queue.push(key);
            resolve()
        })
    }

    execute(flushKeys: string[]): Promise<any> {
        const stateKeys = this.cache.getAllKeys();
        const removeKeys = [];
        const setValues = [];
        for (var i = 0, l = flushKeys.length; i < l; i++) {
            var key = flushKeys[i];
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
        if(removeKeys.length>0) {
            promises.push(this.storage.multiRemove(removeKeys))
        }
        if(setValues.length>0) {
            promises.push(this.storage.multiSet(setValues))
        }
        return Promise.all(promises);
    }

    filter(keys: Array<string>): Array<string> {
        return keys.filter((key => this.checks.reduce(
            (currentValue, layer) => layer.check(key) && currentValue,
            true
        )));
    }

    set(key: string, value: any): string[] {
        return this.sets.reduce(
            (currentValue, layer) => !currentValue ? currentValue : layer.set(currentValue[0], currentValue[1]),
            [ key, value ]
        );
    }
    get(key: string, value: any): string[] {
        return this.gets.reduce(
            (currentValue, layer) => !currentValue ? currentValue : layer.get(currentValue[0], currentValue[1]),
            [ key, value ]
        );
    }
    remove(key: string): string {
        return this.removes.reduce(
            (currentValue, layer) => !currentValue ? currentValue : layer.remove(currentValue),
            key
        );
    }



}


export default StorageProxy;