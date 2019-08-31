import { CacheStorage, DataCache } from './CacheTypes';
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

function webStorage(type: string): CacheStorage {
    const storageType = `${type}Storage`;
    if (!hasStorage(storageType)) {
        return null;
    }
    const storage = self[storageType];
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
        multiSet: (items: string[][]) => promiseVoid((): void => {
            items.forEach((item) => storage.setItem(item[0], item[1]));
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