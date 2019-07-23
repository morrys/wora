import { DataCache, CacheStorage } from "./Cache";
import StorageHelper, { StorageHelperOptions } from './StorageHelper';

function noop() { }
let noopStorage = {
    clear: noop,
    key: noop,
    getItem: noop,
    setItem: noop,
    removeItem: noop,
    length: 0
}

function hasStorage(storageType) {
    if (typeof self !== 'object' || !(storageType in self)) {
        return false
    }

    try {
        let storage: any = self[storageType]
        const testKey = `cache-persist ${storageType} test`
        storage.setItem(testKey, 'test')
        storage.getItem(testKey)
        storage.removeItem(testKey)
    } catch (e) {
        return false
    }
    return true
}

function getStorage(type: string): any {
    const storageType = `${type}Storage`
    if (hasStorage(storageType)) return self[storageType]
    else {
        return noopStorage;
    }
}

let storage = getStorage('local')

function webStorage() {
    return {
        multiRemove: (keys) => {
            for (var i = 0; i < keys.length; i++) {
                storage.removeItem(keys[i]);
            }
        },
        multiGet: (keys) => {
            const data: DataCache = {};
            for (var i = 0; i < keys.length; i++) {
                const key: string = keys[i];
                data[key] = storage.getItem(key);
            }
            return data;
        },
        getAllKeys: () => {
            return Object.keys(storage);
        },
        multiSet: (items) => {
            return new Promise((resolve, reject) => {
                Object.keys(items).forEach(function (key) {
                    storage.setItem(key, items[key]);
                });
                resolve();
            });
        },
        setItem: (key: string, value: string): Promise<void> => {
            return new Promise((resolve, reject) => {
                resolve(storage.setItem(key, value))
            })
        },
        removeItem: (key: string): Promise<void> => {
            return new Promise((resolve, reject) => {
                resolve(storage.removeItem(key))
            })
        },
    }
}

export default webStorage;