import createStorage from "./storage";
import StorageProxy, { Layer, ItemCache } from './StorageProxy';
import noStorage from './nostorage';

export type CacheOptions = {
    serialize?: boolean,
    prefix?: string,
    layers?: Array<Layer<any>>,
    storage?: CacheStorage, 
    webStorage?: "local" | "session",
    disablePersist?: boolean
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

export interface Storage {
    multiRemove: (keys: Array<string>) => Promise<void>,
    multiGet: (keys: Array<string>) => Promise<DataCache>,
    getAllKeys: () => Promise<Array<string>>,
    multiSet: (items: Array<ItemCache<any>>) => Promise<void>,
    setItem: (key: string, value: string) => Promise<void>,
    removeItem: (key: string) => Promise<void> 
}

export type Subscription = {
    callback: (message: string, state: any) => void,
};

class Cache {
    private data: DataCache = {};
    private rehydrated: boolean = false;
    private _subscriptions: Set<Subscription> = new Set();
    public storageOptions;
    private storageProxy;

    constructor(options: CacheOptions = {}) {
        const { 
            storage, 
            prefix = 'cache', 
            serialize = true, 
            layers = [],
            webStorage = 'local',
            disablePersist = false
        } = options;
        const storageOptions = { prefix, serialize, layers };
        this.storageOptions = storageOptions;
        this.storageProxy = new StorageProxy(disablePersist ? noStorage() : storage || createStorage(webStorage), storageOptions);        
    }

    public isRehydrated(): boolean { return this.rehydrated}

    public restore(): Promise<Cache> {
        return new Promise((resolve, reject) => {
            this.storageProxy.restore().then(result => {
                this.data = result;
                this.rehydrated = true;
                resolve(this)
            }).catch(e => reject(e));
        })
        
    }

    public replace(newData): Promise<void> {
        this.data = newData ? Object.assign({}, newData) : Object.create(null);
        return this.storageProxy.replace(newData);
    }

    public purge(): Promise<boolean> {
        this.data = Object.create(null);
        return this.storageProxy.purge();
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
        return this.storageProxy.setItem(key, value);
    }

    public delete(key: string): Promise<any> {
        return this.set(key, null)
    }

    public remove(key: string): Promise<any> {
        delete this.data[key];
        return this.storageProxy.removeItem(key);
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