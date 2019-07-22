import { AsyncStorage } from 'react-native';
import { DataCache, CacheStorage } from './Cache';
import StorageHelper, { StorageHelperOptions } from './StorageHelper';


function NativeStorage(options: StorageHelperOptions): CacheStorage {
    const storageHelper = new StorageHelper(options);
    return {
        getStorage: ():any => AsyncStorage,
        getName: ():string => "AS-" + storageHelper.getPrefix(),
        getOptions: (): StorageHelperOptions => options,
        purge: () => {
            return AsyncStorage.getAllKeys().then((keys: Array<string>) => 
                AsyncStorage.multiRemove(keys.filter((key => storageHelper.filter(key))))
                .then(() => true)
                .catch(() => false)
            );
        },
        restore: (): Promise<DataCache> => {
            return AsyncStorage.getAllKeys().then((keys: Array<string>) =>
                AsyncStorage.multiGet(keys.filter((key => storageHelper.filter(key)))).then((data: Array<Array<string>>): DataCache => {
                    const result: DataCache = {};
                    for (var i = 0; i < data.length; i++) {
                        const itemStorage = data[i];
                        const key = itemStorage[0];
                        const value = itemStorage[1];
                        const item = storageHelper.get(key, value)
                        result[item.key] = item.value;
                    }
                    return result;
                }));
        },
        replace: (data: any): Promise<void> => {
            const items = [];
            Object.keys(data).forEach(function (key) {
                const value = data[key];
                const item = storageHelper.set(key, value)
                items.push([item.key, item.value])
            });
            return AsyncStorage.multiSet(items);
                
        },
        setItem: (key: string, value: string): Promise<void> => {
            const item = storageHelper.set(key, value)
            return AsyncStorage.setItem(item.key, item.value);
        },
        removeItem: (key: string): Promise<void> => {
            const keyToRemove = storageHelper.remove(key)
            return AsyncStorage.removeItem(keyToRemove);
        },
    }
}

export default NativeStorage;