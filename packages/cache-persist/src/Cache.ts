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
    replace: (data: any) => Promise<void>;
    setItem: (key: string, item: string | object) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
}

export type Subscription = {
    callback: (message: string, state: any) => void,
};

class Cache {
    private data: DataCache = {};
    private rehydrated: boolean = false;
    private serialize: boolean = true;
    private storage: CacheStorage;
    private _subscriptions: Set<Subscription> = new Set();

    constructor(options : CacheOptions = {}) { //TODO custom storage
        options = {
            prefix: 'cache',
            serialize: true,
            ...options,
        }
        this.serialize = options.serialize;
        this.storage = options.storage || createStorage(options.prefix);
    }

    public isRehydrated(): boolean { return this.rehydrated}

    public restore(): Promise<Cache> {
        return new Promise((resolve, reject) => {
            this.storage.restore(this.serialize).then(result => {
                this.data = result;
                this.rehydrated = true;
                resolve(this)
            }).catch(e => reject(e));
        })
        
    }

    public replace(newData): void {
        this.data = newData ? Object.assign({}, newData) : Object.create(null);
    }

    public getStorageName(): string {
        return this.storage.getCacheName()
    }

    public purge(): Promise<boolean> {
        this.data = Object.create(null);
        return this.storage.purge();
    }

    public clear(): Promise<boolean> {
        return this.purge();
    }

    public getState(): Readonly<{ [key: string]: any }> {
        return Object.assign({}, this.data);
    }

    public toObject(): Readonly<{ [key: string]: any }> {
        return this.getState();
    }

    public get(key: string): any {
        return this.data[key];
    }

    public set(key: string, value: any): Promise<any> {
        //if (!key) return handleError('set', 'a key');

        this.data[key] = value;
        return this.storage.setItem(key, this.serialize ? JSON.stringify(value) : value);
    }

    public delete(key: string): Promise<any> {
        return this.set(key, null)
    }

    public remove(key: string): Promise<any> {
        delete this.data[key];
        return this.storage.removeItem(key);
    }

    public getAllKeys(): Array<string> {
        return Object.keys(this.data);
    }

    public subscribe(
        callback: (message: string, state: any) => void,
    ): () => void {
        const subscription = { callback };
        const dispose = () => {
            this._subscriptions.delete(subscription);
        };
        this._subscriptions.add(subscription);
        return dispose;
    }

    public notify(message: string = "notify data"): void {
        const state = this.toObject();
        this._subscriptions.forEach(subscription => {
            subscription.callback(message, state);
        });
    }
}

export default Cache;