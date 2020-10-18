import { openDB, IDBPDatabase } from 'idb';
import { ICacheStorage } from './CacheTypes';

export type IOnUpgrade = (db: any, oldVersion: number, newVersion: number, transaction: any) => void;

export function createIdbStorage(dbPromise: Promise<IDBPDatabase<any>>, storeName: string): ICacheStorage {
    let db = null; // getAllKey called when restored
    return {
        // prettier-ignore
        getAllKeys: () => dbPromise.then((database) => {
            db = database;
            return db.getAllKeys(storeName);
        }),
        setItem: (key, value) => db.put(storeName, value, key),
        removeItem: (key) => db.delete(storeName, key),
        getItem: (key) => db.get(storeName, key),
    } as ICacheStorage;
}

export class IDBStorage {
    public static create(options: {
        name?: string;
        storeNames?: Array<string>;
        version?: number;
        onUpgrade?: IOnUpgrade;
    }): Array<ICacheStorage> {
        const { name = 'cache', storeNames = ['persist'], version = 1, onUpgrade = (_db, _oV, _nV, _t): void => undefined } = options;

        const dbPromise = openDB<any>(name, version, {
            upgrade(database, oldVersion, newVersion, transaction) {
                if (newVersion === 1) {
                    storeNames.forEach((storeName) => database.createObjectStore(storeName));
                }
                onUpgrade(database, oldVersion, newVersion, transaction);
            },
        });

        return storeNames.map((value) => createIdbStorage(dbPromise, value));
    }
}
