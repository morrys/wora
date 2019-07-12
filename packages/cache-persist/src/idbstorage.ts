import { openDB, IDBPDatabase } from 'idb';
import { DataCache, CacheStorage } from './Cache';

class IDBStorage {

    static create(name?: string, storeNames?: string[]): CacheStorage[] {

        const options = {
            /** Database name */
            name: name || 'cache',
            /** Store name */
            storeNames: ['persist'],
            /** Database version */
            version: 1,
        }

        const dbPromise = openDB<any>(options.name, options.version, {
            upgrade(dbPromise) {
                storeNames.forEach(storeName => {
                    dbPromise.createObjectStore(storeName);
                });

            }
        })

        const listItems = storeNames.map((value) => (
            createIdbStorage(dbPromise, options.name, value)
        ));

        return listItems;
    }

}

function createIdbStorage(dbPromise: Promise<IDBPDatabase<any>>, name: string, storeName: string): CacheStorage {
    return {
        getStorage: (): any => dbPromise,
        getCacheName: (): string => "IDB-" + name + "-" + storeName,
        purge: () => {
            return dbPromise.then(db => {
                return db.clear(storeName).then(() => true).catch(() => false);
            });
        },
        restore: (deserialize: boolean): Promise<DataCache> => {
            return dbPromise.then(db =>
                db.getAllKeys(storeName).then(async keys => {
                    const result: DataCache = new Map();
                    for (var i = 0; i < keys.length; i++) {
                        const value = await db.get(storeName, keys[i]);
                        result["" + keys[i]] = deserialize ? JSON.parse(value) : value;
                    }
                    return result;
                })
            );
        },
        replace: (data: any, serialize: boolean): Promise<void> => {
            return dbPromise.then(db =>
                Object.keys(data).forEach(function (key) {
                    const value = data[key];
                    db.put(storeName, serialize ? JSON.stringify(value) : value, key);
                }));
        },
        setItem: (key: string, item: object): Promise<void> => {
            return dbPromise.then(db =>
                db.put(storeName, item, key))
        },
        removeItem: (key: string): Promise<void> => {
            return dbPromise.then(db =>
                db.delete(storeName, key))
        },
    }
}

export default IDBStorage;