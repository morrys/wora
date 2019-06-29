import { AsyncStorage } from 'react-native';
import { DataCache, CacheStorage } from './Cache';


function NativeStorage(prefix: string): CacheStorage {
    const prefixKey = prefix + ".";
    return {
        getStorage: ():any => AsyncStorage,
        getCacheName: ():string => "AS-" + prefix,
        purge: () => {
            return AsyncStorage.getAllKeys().then((keys: Array<string>) => 
                AsyncStorage.multiRemove(keys.filter((key => key.startsWith(prefixKey))))
                .then(() => true)
                .catch(() => false)
            );
        },
        restore: (deserialize: boolean): Promise<DataCache> => {
            return AsyncStorage.getAllKeys().then((keys: Array<string>) =>
                AsyncStorage.multiGet(keys.filter((key => key.startsWith(prefixKey)))).then((data: Array<Array<string>>): DataCache => {
                    const result: DataCache = {};
                    for (var i = 0; i < data.length; i++) {
                        const item = data[i];
                        const key = item[0];
                        const value = deserialize ? JSON.parse(item[1]) : item[1];
                        result[key.slice(prefixKey.length)] = value;
                    }
                    return result;
                }));
        },
        setItem: (key: string, item: string): Promise<void> => {
            return AsyncStorage.setItem(prefixKey+key, item);
        },
        removeItem: (key: string): Promise<void> => {
            return AsyncStorage.removeItem(prefixKey+key);
        },
    }
}

export default NativeStorage;