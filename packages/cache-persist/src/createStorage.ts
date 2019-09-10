/* global self */
/* eslint no-restricted-globals:0 */
import { ICacheStorage } from './CacheTypes';
import { promiseVoid, promiseResult } from './StorageProxy';

function createStorage(type: string): ICacheStorage {
    const storageType = `${type}Storage`;
    if (!(typeof self !== 'object' || !(storageType in self))) {
        return null;
    }
    const storage = self[storageType];
    return {
        getAllKeys: () => promiseResult<Array<string>>(() => Object.keys(storage)),
        setItem: (key, value) => promiseVoid(() => storage.setItem(key, value)),
        removeItem: (key) => promiseVoid(() => storage.removeItem(key)),
        getItem: (key) => promiseResult<string>(() => storage.getItem(key)),
    } as ICacheStorage;
}

export default createStorage;
