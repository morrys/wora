import { DataCache, CacheStorage } from "./Cache";

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
        let storage:any = self[storageType]
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

function webStorage(prefix: string): CacheStorage {
    const prefixKey = prefix+".";
    return {
        getStorage: ():any => storage,
        getCacheName: ():string => "LS-" + prefix,

        purge: () => {
            return new Promise((resolve, reject) => {
                
                const keys = Object.keys(storage)
                const size = keys.length;
                for (var i = 0; i < size; i++) {
                    const key: string = keys[i];
                    if (key.startsWith(prefixKey)) {
                        storage.removeItem(key);
                    }
                }
                resolve(true)
            });
        },
        restore: (deserialize: boolean): Promise<DataCache> => {
            return new Promise((resolve, reject) => {
                const data: DataCache = {};
                for (var i = 0; i < storage.length; i++) {
                    const key: string = storage.key(i);
                    if (key.startsWith(prefixKey)) {
                        const value = deserialize ? JSON.parse(storage.getItem(key)) : storage.getItem(key);
                        data[key.slice(prefixKey.length)] = value;
                    }
                }
                resolve(data)
            })
        },
        setItem: (key: string, item: string): Promise<void> => {
            return new Promise((resolve, reject) => {
                resolve(storage.setItem(prefixKey+key, item))
            })
        },
        removeItem: (key: string): Promise<void> => {
            return new Promise((resolve, reject) => {
                resolve(storage.removeItem(prefixKey+key))
            })
        },
    }
}

export default webStorage;