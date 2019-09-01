import { openDB, IDBPDatabase } from 'idb';
import { CacheStorage } from './CacheTypes';

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
    let db = null; // getAllKey called when restored 
    return {
        getAllKeys: () => {
            return dbPromise.then(database =>  {
                db = database;
                return db.getAllKeys(storeName);
            });
        },
        setItem: (key: string, value: string): Promise<void> => {
            return db.put(storeName, value, key);
        },
        removeItem: (key: string): Promise<void> => {
            return db.delete(storeName, key);
        },
        getItem: (key: string): Promise<string> => {
            return db.get(storeName, key);
        }
    }
}

export default IDBStorage;