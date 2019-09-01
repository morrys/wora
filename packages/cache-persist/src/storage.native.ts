import AsyncStorage from '@react-native-community/async-storage';
import { CacheStorage } from './CacheTypes';

/**
 * I had to restore the abstraction above the AsyncStorage for a 
 * typescript problem in the multiGet (readonly parameter)
 * 
 */

function NativeStorage(type): CacheStorage {
    return {
        multiRemove: (keys): Promise<void> => {
            return AsyncStorage.multiRemove(keys);
        },
        multiGet: (keys): Promise<string[][]> => {
            return AsyncStorage.multiGet(keys);
        },
        getAllKeys: (): Promise<Array<string>> => {
            return AsyncStorage.getAllKeys();
        },
        multiSet: (items: string[][]) => {
            return AsyncStorage.multiSet(items);
        },
        setItem: (key: string, value: string): Promise<void> => {
            return AsyncStorage.setItem(key, value)
        },
        removeItem: (key: string): Promise<void> => {
            return AsyncStorage.removeItem(key);
        },
        getItem: (key: string): Promise<string> => {
            return AsyncStorage.getItem(key);
        },
    }
}

export default NativeStorage;