import createStorage from "./storage";
import StorageHelper, { Layer, StorageHelperOptions } from './StorageHelper';

export type CacheOptions = {
    serialize?: boolean,
    prefix?: string,
    layers?: Array<Layer<any>>
    storage?: CacheStorage, 
}

export type DataCache = {
    [key: string]: any
}

export interface CacheStorage {
    purge: () => Promise<boolean>;
    restore: () => Promise<DataCache>;
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
    private _subscriptions: Set<Subscription> = new Set();
    public storageOptions;
    private storageHelper;

    constructor(options: CacheOptions = {}) { //TODO custom storage
        const { storage, prefix = 'cache', serialize = true, layers = []} = options;
        const storageOptions = { prefix, serialize, layers };
        this.storageOptions = storageOptions;
        this.storageHelper = new StorageHelper(storage || createStorage(), storageOptions);        
    }

    public isRehydrated(): boolean { return this.rehydrated}

    public restore(): Promise<Cache> {
        return new Promise((resolve, reject) => {
            this.storageHelper.restore().then(result => {
                this.data = result;
                this.rehydrated = true;
                resolve(this)
            }).catch(e => reject(e));
        })
        
    }

    public replace(newData): Promise<void> {
        this.data = newData ? Object.assign({}, newData) : Object.create(null);
        return this.storageHelper.replace(newData);
    }

    public purge(): Promise<boolean> {
        this.data = Object.create(null);
        return this.storageHelper.purge();
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
        this.data[key] = value;
        return this.storageHelper.setItem(key, value);
    }

    public delete(key: string): Promise<any> {
        return this.set(key, null)
    }

    public remove(key: string): Promise<any> {
        delete this.data[key];
        return this.storageHelper.removeItem(key);
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