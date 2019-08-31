import { Storage, ItemCache, DataCache } from './CacheTypes';
import { promiseVoid, promiseResult } from './StorageProxy';

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

export function getStorage(type: string): any {
    const storageType = `${type}Storage`
    if (hasStorage(storageType)) return self[storageType]
    else {
        return null;
    }
}


function webStorage(storage): Storage {
    return {
        multiRemove: (keys: Array<string>) => promiseVoid((): void => {
            keys.forEach(function (key) {
                storage.removeItem(key);
            })
        }),
        multiGet: (keys: Array<string>) => promiseResult(() => {
            const data: DataCache = {};
            keys.forEach((key) => data[key] = storage.getItem(key));
            return data;
        }),
        getAllKeys: (): Promise<Array<string>> => promiseResult<Array<string>>(() => {
            return Object.keys(storage)
        }),
        multiSet: (items: Array<ItemCache<any>>) => promiseVoid((): void => {
            items.forEach((item) => storage.setItem(item.key, item.value));
        }),
        setItem: (key: string, value: string): Promise<void> => promiseVoid((): void => {
            storage.setItem(key, value)
        }),
        removeItem: (key: string): Promise<void> => promiseVoid((): void => {
            storage.removeItem(key)
        }),
    }
}

export default webStorage;