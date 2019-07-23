import jsonSerialize from './layers/jsonSerialize';
import prefixLayer from './layers/prefixLayer';
import { CacheStorage, DataCache, Storage } from './Cache';



export type StorageHelperOptions = {
    serialize?: boolean,
    prefix?: string,
    layers?: Array<Layer<any>>
}

export type ItemCache<T> = {
    key: string, 
    value: T
}

export interface Layer<T> {
    set: (key: string, value: T) => ItemCache<T>
    get: (key: string, value: T) => ItemCache<T>
    remove?: (key: string) => string
    filter?: (key: string) => boolean
}

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


class StorageHelper implements CacheStorage {

    storage: Storage;
    serialize: boolean;
    prefix: string;
    layers: Array<Layer<any>> = [];
    filters: Array<Layer<any>>;
    gets: Array<Layer<any>>;
    sets: Array<Layer<any>>;
    removes: Array<Layer<any>>;


    constructor(storage: any, options: StorageHelperOptions = {}) {
        const { prefix, serialize, layers } = options;
        this.serialize = serialize;
        this.prefix = prefix;
        this.layers = prefix ? this.layers.concat(prefixLayer(prefix)) : this.layers
        this.layers = this.layers.concat(layers);
        this.layers = serialize ? this.layers.concat(jsonSerialize) : this.layers;
        this.storage = storage;
        this.init();
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
                    result[item.key] = item.value;    
                });
                return result;
            });
    }
    replace(data: any): Promise<void> {
        const items: Array<ItemCache<any>> = [];
        return this.purge().then(async () => {
            Object.entries(data).forEach(([key, value]) => items.push(this.set(key, value)));
            await this.storage.multiSet(items);
        })

    }

    removeItem(key: string): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const keyToRemove = this.remove(key);
            await this.storage.removeItem(keyToRemove);
            resolve()
        })
    }

    setItem(key: string, value: any): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const item = this.set(key, value)
            await this.storage.setItem(item.key, item.value)
            resolve()
        })
    }

    init() {
        this.filters = this.layers.filter((layer => !!layer.filter));
        this.sets = this.layers.filter((layer => !!layer.set));
        this.removes = this.layers.filter((layer => !!layer.remove));
        this.gets = this.layers.slice().reverse().filter((layer => !!layer.get));
    }

    filter(keys: Array<string>): Array<string> {
        return keys.filter((key => this.filters.reduce(
            (currentValue, layer) => layer.filter(key) && currentValue,
            true
        )));
    }

    set(key: string, value: any): ItemCache<any> {
        return this.sets.reduce(
            (currentValue, layer) => layer.set(currentValue.key, currentValue.value),
            { key, value }
        );
    }
    get(key: string, value: any): ItemCache<any> {
        return this.gets.reduce(
            (currentValue, layer) => layer.get(currentValue.key, currentValue.value),
            { key, value }
        );
    }
    remove(key: string): string {
        return this.removes.reduce(
            (currentValue, layer) => layer.remove(currentValue),
            key
        );
    }



}


export default StorageHelper;