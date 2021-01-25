import { ICacheStorage } from './CacheTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * I had to restore the abstraction above the AsyncStorage for a
 * typescript problem in the multiGet (readonly parameter)
 *
 */

export function createStorage(_type): ICacheStorage {
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
