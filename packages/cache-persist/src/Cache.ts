import createStorage from "./storage";

export interface CacheOptions {
        storage?: CacheStorage, 
        prefix?: string, 
        version?: number,
        serialize?: boolean,
        encryption?: boolean //TODO
}

export type DataCache = {
    [key: string]: any
}

export interface CacheStorage {
    getStorage: () => any;
    getCacheName: () => string;
    purge: () => Promise<boolean>;
    restore: (deserialize: boolean) => Promise<DataCache>;
    setItem: (key: string, item: string | object) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
}

class Cache {
    private data: DataCache = {};
    private rehydrated: boolean = false;
    private serialize: boolean = true;
    private storage: CacheStorage;

    constructor(options : CacheOptions = {}) { //TODO custom storage
        options = {
            prefix: 'cache',
            serialize: true,
            ...options,
        }
        this.serialize = options.serialize;
        this.storage = options.storage || createStorage(options.prefix);
    }

    isRehydrated(): boolean { return this.rehydrated}

    restore(): Promise<Cache> {
        return new Promise((resolve, reject) => {
            this.storage.restore(this.serialize).then(result => {
                this.data = result;
                this.rehydrated = true;
                resolve(this)
            }).catch(e => reject(e));
        })
        
    }

    getStorageName(): string {
        return this.storage.getCacheName()
    }

    purge(): Promise<boolean> {
        this.data = {};
        return this.storage.purge();
    }

    getState(): Readonly<{ [key: string]: any }> {
        return this.data;
    }

    get(key: string): any {
        return this.data[key];
    }

    set(key: string, value: any): Promise<any> {
        //if (!key) return handleError('set', 'a key');

        this.data[key] = value;
        return this.storage.setItem(key, this.serialize ? JSON.stringify(value) : value);
    }

    delete(key: string): Promise<any> {
        return this.set(key, null)
    }

    remove(key: string): Promise<any> {
        delete this.data[key];
        return this.storage.removeItem(key);
    }

    getAllKeys(): Array<string> {
        return Object.keys(this.data);
    }
}

export default Cache;