import { openDB, IDBPDatabase } from 'idb';
import { DataCache, CacheStorage } from './Cache';
import StorageHelper, { StorageHelperOptions } from './StorageHelper';

class IDBStorage {

    static create(options: { name?: string, storeNames?: string[], version?: number, storageOptions: StorageHelperOptions}): CacheStorage[] {

        const {
            name = 'cache',
            storeNames = ['persist'],
            version = 1,
            storageOptions = {},
        } = options;

        const dbPromise = openDB<any>(name, version, {
            upgrade(dbPromise) {
                storeNames.forEach(storeName => {
                    dbPromise.createObjectStore(storeName);
                });

            }
        })

        const listItems = storeNames.map((value) => (
            createIdbStorage(dbPromise, name, value, storageOptions)
        ));

        return listItems;
    }

}

function createIdbStorage(dbPromise: Promise<IDBPDatabase<any>>, name: string, storeName: string, storageOptions: StorageHelperOptions): CacheStorage {
    const storageHelper = new StorageHelper(storageOptions);
    return {
        getStorage: (): any => dbPromise,
        getName: (): string => "IDB-" + name + "-" + storeName,
        getOptions: (): StorageHelperOptions => storageOptions,
        purge: () => {
            return dbPromise.then(db => {
                return db.clear(storeName).then(() => true).catch(() => false);
            });
        },
        restore: (): Promise<DataCache> => {
            return dbPromise.then(db =>
                db.getAllKeys(storeName).then(async keys => {
                    const result: DataCache = new Map();
                    for (var i = 0; i < keys.length; i++) {
                        const key = keys[i];
                        const value = await db.get(storeName, key);
                        const item = storageHelper.get(key, value)
                        result["" + item.key] = item.value;
                    }
                    return result;
                })
            );
        },
        replace: (data: any): Promise<void> => {
            return dbPromise.then(db =>
                Object.keys(data).forEach(function (key) {
                    const value = data[key];
                    const item = storageHelper.set(key, value)
                    db.put(storeName, item.value, item.key);
                }));
        },
        setItem: (key: string, value: object): Promise<void> => {
            return dbPromise.then(db => {
                const item = storageHelper.set(key, value)
                return db.put(storeName, item.value, item.key)
            })
        },
        removeItem: (key: string): Promise<void> => {
            return dbPromise.then(db => {
                const keyToRemove = storageHelper.remove(key)
                db.delete(storeName, keyToRemove)
            })
        },
    }
}

export default IDBStorage;