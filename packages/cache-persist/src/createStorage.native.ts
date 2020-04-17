/* eslint import/no-extraneous-dependencies:0 */

import { ICacheStorage } from './CacheTypes';
import { AsyncStorage as RNAsyncStorage } from 'react-native';
let storage = null;
try {
    storage = require('@react-native-community/async-storage');
} catch (e) {
    if (!RNAsyncStorage) {
        throw e;
    }
    console.log('warning: must install @react-native-community/async-storage');
    storage = RNAsyncStorage;
}

/**
 * I had to restore the abstraction above the AsyncStorage for a
 * typescript problem in the multiGet (readonly parameter)
 *
 */

function createStorage(_type): ICacheStorage {
    return {
        multiRemove: (keys) => storage.multiRemove(keys),
        multiGet: (keys) => storage.multiGet(keys),
        getAllKeys: () => storage.getAllKeys(),
        multiSet: (items) => storage.multiSet(items),
        setItem: (key, value) => storage.setItem(key, value),
        removeItem: (key) => storage.removeItem(key),
        getItem: (key) => storage.getItem(key),
    } as ICacheStorage;
}

export default createStorage;
