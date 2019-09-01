import { CacheStorage } from './CacheTypes';
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
        getAllKeys: (): Promise<Array<string>> => promiseResult<Array<string>>(() => {
            return Object.keys(storage)
        }),
        setItem: (key: string, value: string): Promise<void> => promiseVoid((): void => {
            storage.setItem(key, value)
        }),
        removeItem: (key: string): Promise<void> => promiseVoid((): void => {
            storage.removeItem(key)
        }),
        getItem: (key: string): Promise<string> => promiseResult<string>(() => storage.getItem(key))
        
    }
}

export default webStorage;