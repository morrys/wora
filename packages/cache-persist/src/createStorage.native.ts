/* eslint import/no-extraneous-dependencies:0 */
/* eslint @typescript-eslint/no-var-requires:0 */

import { ICacheStorage } from './CacheTypes';
import { AsyncStorage as RNAsyncStorage } from 'react-native';
const tslib = require('tslib');

let storage = null;
try {
    storage = tslib.__importDefault(require('@react-native-async-storage/async-storage')).default;
} catch (e) {
    if (!RNAsyncStorage) {
        throw e;
    }
    console.warn('Native AsyncStorage will be used', e);
    storage = RNAsyncStorage;
}

/**
 * I had to restore the abstraction above the AsyncStorage for a
 * typescript problem in the multiGet (readonly parameter)
 *
 */

export function createStorage(_type): ICacheStorage {
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
