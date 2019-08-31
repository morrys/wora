import createWebStorage from "./storage";
import StorageProxy from './StorageProxy';
import { DataCache, Subscription, CacheOptions } from "./CacheTypes";
import NoStorageProxy from './NoStorageProxy';

export const PREFIX_DELIMITER: string = ".";

class Cache {
    private data: DataCache = {};
    private rehydrated: boolean = false;
    private _subscriptions: Set<Subscription> = new Set();
    public storageOptions;
    private storageProxy;

    constructor(options: CacheOptions = {}) {
        const { 
            prefix = 'cache', 
            serialize = true, 
            layers = [],
            webStorage = 'local',
            disablePersist = false,
            storage = createWebStorage(webStorage), 
            errorHandling,
        } = options;
        const storageOptions = { prefix, serialize, layers, errorHandling };
        this.storageOptions = storageOptions;      
        this.storageProxy = disablePersist || !storage ? new NoStorageProxy() : new StorageProxy(this, storage, storageOptions);        
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