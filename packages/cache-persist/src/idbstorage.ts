import { openDB, IDBPDatabase } from 'idb';
import { DataCache, CacheStorage } from './Cache';
import StorageHelper, { StorageHelperOptions } from './StorageHelper';

class IDBStorage {

    static create(options: { name?: string, storeNames?: string[], version?: number}): any[] {

        const {
            name = 'cache',
            storeNames = ['persist'],
            version = 1,
        } = options;

        const dbPromise = openDB<any>(name, version, {
            upgrade(dbPromise) {
                storeNames.forEach(storeName => {
                    dbPromise.createObjectStore(storeName);
                });

            }
        })

        const listItems = storeNames.map((value) => (
            createIdbStorage(dbPromise, value)
        ));

        return listItems;
    }

}

function createIdbStorage(dbPromise: Promise<IDBPDatabase<any>>, storeName: string) {
    return {
        multiRemove: (keys) => {
            return dbPromise.then(db => {
                for (var i = 0; i < keys.length; i++) {
                    db.delete(storeName, keys[i]);
                }
            })
        },
        multiGet: (keys) => {
            return dbPromise.then(async db => {
                const data: DataCache = {};
                for (var i = 0; i < keys.length; i++) {
                    const key: string = keys[i];
                    data[key] = await db.get(storeName, key);
                }
                return data;
            })
        },
        getAllKeys: () => {
            return dbPromise.then(db => db.getAllKeys(storeName));
        },
        multiSet: async (items) => {
            return dbPromise.then(db =>
                Object.keys(items).forEach(function (key) {
                    db.put(storeName, items[key], key);
                }))
        },
        setItem: (key: string, value: string): Promise<void> => {
            return dbPromise.then(db => db.put(storeName, value, key))
        },
        removeItem: (key: string): Promise<void> => {
            return dbPromise.then(db => db.delete(storeName, key))
        },
    }
}

export default IDBStorage;