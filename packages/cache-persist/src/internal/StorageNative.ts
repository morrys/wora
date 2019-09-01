import { CacheStorage } from '../CacheTypes';


function NativeStorage(AsyncStorage): CacheStorage {
    return {
        multiRemove: (keys) => {
            return AsyncStorage.multiRemove(keys);
        },
        multiGet: (keys) => {
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