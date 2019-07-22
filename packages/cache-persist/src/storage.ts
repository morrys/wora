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

function webStorage(options: StorageHelperOptions): CacheStorage {
    const storageHelper = new StorageHelper(options);
    return {
        getStorage: ():any => storage,
        getName: ():string => "LS-" + storageHelper.getPrefix(),
        getOptions: (): StorageHelperOptions => options,

        purge: () => {
            return new Promise((resolve, reject) => {
                
                const keys = Object.keys(storage)
                const size = keys.length;
                for (var i = 0; i < size; i++) {
                    const key: string = keys[i];
                    if (storageHelper.filter(key)) {
                        storage.removeItem(key);
                    }
                }
                resolve(true)
            });
        },
        restore: (): Promise<DataCache> => {
            return new Promise((resolve, reject) => {
                const data: DataCache = {};
                for (var i = 0; i < storage.length; i++) {
                    const key: string = storage.key(i);
                    if (storageHelper.filter(key)) {
                        const item = storageHelper.get(key, data[key])
                        data[item.key] = item.value;
                    }
                }
                resolve(data)
            })
        },
        replace: (data: any): Promise<void> => {
            return new Promise((resolve, reject) => {
                Object.keys(data).forEach(function(key) {
                    const item = storageHelper.set(key, data[key])
                    storage.setItem(item.key, item.value);
                });
                resolve();
            });
        },
        setItem: (key: string, value: string): Promise<void> => {
            return new Promise((resolve, reject) => {
                const item = storageHelper.set(key, value)
                resolve(storage.setItem(item.key, item.value))
            })
        },
        removeItem: (key: string): Promise<void> => {
            return new Promise((resolve, reject) => {
                const keyToRemove = storageHelper.remove(key)
                resolve(storage.removeItem(storageHelper.remove(keyToRemove)))
            })
        },
    }
}

export default webStorage;