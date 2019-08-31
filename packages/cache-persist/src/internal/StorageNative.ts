import { CacheStorage, DataCache } from '../CacheTypes';


function NativeStorage(AsyncStorage): CacheStorage {
    return {
        multiRemove: (keys) => {
            return AsyncStorage.multiRemove(keys);
        },
        multiGet: (keys) => {
            return AsyncStorage.multiGet(keys).then((data: Array<Array<string>>): DataCache => {
                const result: DataCache = {};
                for (var i = 0; i < data.length; i++) {
                    const itemStorage = data[i];
                    const key = itemStorage[0];
                    const value = itemStorage[1];
                    result[key] = value;
                }
                return result;
            });
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
    }
}

export default NativeStorage;