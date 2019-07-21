import { DataCache, CacheStorage } from './Cache';
function noStorage(prefix: string): CacheStorage {
    const prefixKey = prefix+".";
    return {
        getStorage: ():any => {},
        getCacheName: ():string => "NO-" + prefix,

        purge: () => {
            return new Promise((resolve, reject) => {
                resolve(true)
            });
        },
        restore: (deserialize: boolean): Promise<DataCache> => {
            return new Promise((resolve, reject) => {
                const data: DataCache = {};
                for (var i = 0; i < storage.length; i++) {
                    const key: string = storage.key(i);
                    if (key.startsWith(prefixKey)) {
                        const value = deserialize ? JSON.parse(storage.getItem(key)) : storage.getItem(key);
                        data[key.slice(prefixKey.length)] = value;
                    }
                }
                resolve(data)
            })
        },
        replace: (data: any, serialize: boolean): Promise<void> => {
            return new Promise((resolve, reject) => {
                Object.keys(data).forEach(function(key) {
                    const value = data[key];
                    storage.setItem(prefixKey+key, serialize ? JSON.stringify(value) : value);
                });
                resolve();
            });
        },
        setItem: (key: string, item: string): Promise<void> => {
            return new Promise((resolve, reject) => {
                resolve(storage.setItem(prefixKey+key, item))
            })
        },
        removeItem: (key: string): Promise<void> => {
            return new Promise((resolve, reject) => {
                resolve(storage.removeItem(prefixKey+key))
            })
        },
    }
}