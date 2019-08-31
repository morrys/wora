import { openDB, IDBPDatabase } from 'idb';
import { DataCache, CacheStorage } from './CacheTypes';

export type OnUpgrade = {
    (db: any, oldVersion: number, newVersion: number, transaction: any): void
}

class IDBStorage {

    static create(options: {
        name?: string,
        storeNames?: string[],
        version?: number,
        onUpgrade?: OnUpgrade
    }): any[] {

        const {
            name = 'cache',
            storeNames = ['persist'],
            version = 1,
            onUpgrade = (db, oldVersion, newVersion, transaction) => { }
        } = options;

        const dbPromise = openDB<any>(name, version, {
            upgrade(dbPromise, oldVersion, newVersion, transaction) {
                if (newVersion === 1) {
                    storeNames.forEach(storeName => {
                        dbPromise.createObjectStore(storeName);
                    });
                }
                onUpgrade(dbPromise, oldVersion, newVersion, transaction);

            }
        })

        const listItems = storeNames.map((value) => (
            createIdbStorage(dbPromise, value)
        ));

        return listItems;
    }

}

export function createIdbStorage(dbPromise: Promise<IDBPDatabase<any>>, storeName: string): CacheStorage {
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
        multiSet: async (items: string[][]) => {
            return dbPromise.then(db =>
                items.forEach(function (item) {
                    db.put(storeName, item[1], item[0]);
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