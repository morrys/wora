import jsonSerialize from './layers/jsonSerialize';
import prefixLayer from './layers/prefixLayer';
import { CacheStorage, DataCache } from './Cache';



export type StorageHelperOptions = {
    serialize?: boolean,
    prefix?: string,
    layers?: Array<Layer<any>>
}

export interface Layer<T> {
    set: (key: string, value: T) => { key: string, value: T }
    get: (key: string, value: T) => { key: string, value: T }
    remove?: (key: string) => string
    filter?: (key: string) => boolean
}



class StorageHelper implements CacheStorage {

    storage: any;
    serialize: boolean;
    prefix: string;
    layers: Array<Layer<any>> = [];
    filters: Array<any>;
    gets: Array<any>;
    sets: Array<any>;
    removes: Array<any>;


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

    purge() {
        return this.storage.getAllKeys().then((keys: Array<string>) =>
            this.storage.multiRemove(this.filter(keys))
                .then(() => true)
                .catch(() => false)
        );
    }
    restore(): Promise<DataCache> {
        return this.storage.getAllKeys().then((keys: Array<string>) =>
            this.storage.multiGet(this.filter(keys)).then((data: Array<Array<string>>): DataCache => {
                const result: DataCache = {};
                for (var i = 0; i < data.length; i++) {
                    const itemStorage = data[i];
                    const key = itemStorage[0];
                    const value = itemStorage[1];
                    const item = this.get(key, value)
                    result[item.key] = item.value;
                }
                return result;
            }));
    }
    replace(data: any): Promise<void> {
        const items = [];
        return this.purge().then(() => {
            Object.keys(data).forEach(function (key) {
                const value = data[key];
                const item = this.set(key, value)
                items.push([item.key, item.value])
            });
            this.storage.multiSet(items);
        })

    }

    removeItem(key: string): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const keyToRemove = this.remove(key)
            resolve(await this.storage.removeItem(keyToRemove))
        })
    }

    setItem(key: string, value: any): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const item = this.set(key, value)
            resolve(await this.storage.setItem(item.key, item.value))
        })
    }

    init() {
        this.filters = this.layers.filter((layer => !!layer.filter));
        this.sets = this.layers.filter((layer => !!layer.set));
        this.removes = this.layers.filter((layer => !!layer.remove));
        this.gets = this.layers.slice().reverse().filter((layer => !!layer.get));
    }

    filter(keys: string[]) {
        return keys.filter((key => this.filters.reduce(
            (currentValue, layer) => layer.filter(key) && currentValue,
            true
        )));
    }

    set(key: string, value: any) {
        return this.sets.reduce(
            (currentValue, layer) => layer.set(currentValue.key, currentValue.value),
            { key, value }
        );
    }
    get(key: string, value: any) {
        return this.gets.reduce(
            (currentValue, layer) => layer.get(currentValue.key, currentValue.value),
            { key, value }
        );
    }
    remove(key: string): any {
        return this.removes.reduce(
            (currentValue, layer) => layer.remove(currentValue),
            key
        );
    }



}


export default StorageHelper;