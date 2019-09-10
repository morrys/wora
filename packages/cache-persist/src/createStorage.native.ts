/* eslint import/no-extraneous-dependencies:0 */
import AsyncStorage from '@react-native-community/async-storage';
import { ICacheStorage } from './CacheTypes';

/**
 * I had to restore the abstraction above the AsyncStorage for a
 * typescript problem in the multiGet (readonly parameter)
 *
 */

function createStorage(_type): ICacheStorage {
    return {
        multiRemove: (keys) => AsyncStorage.multiRemove(keys),
        multiGet: (keys) => AsyncStorage.multiGet(keys),
        getAllKeys: () => AsyncStorage.getAllKeys(),
        multiSet: (items) => AsyncStorage.multiSet(items),
        setItem: (key, value) => AsyncStorage.setItem(key, value),
        removeItem: (key) => AsyncStorage.removeItem(key),
        getItem: (key) => AsyncStorage.getItem(key),
    } as ICacheStorage;
}

export default createStorage;
