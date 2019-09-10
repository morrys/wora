import createStorage from './createStorage';
import StorageProxy from './StorageProxy';
import { DataCache, ICache, Subscription, CacheOptions } from './CacheTypes';
import NoStorageProxy from './NoStorageProxy';

class Cache implements ICache {
    public storageOptions;
    private data: DataCache = {};
    private rehydrated = false;
    private subscriptions: Set<Subscription> = new Set();
    private storageProxy;
    private promisesRestore;

    constructor(options: CacheOptions = {}) {
        const {
            prefix = 'cache',
            serialize = true,
            layers = [],
            webStorage = 'local',
            disablePersist = false,
            storage = createStorage(webStorage),
            errorHandling = (_cache, _error): boolean => true,
            throttle,
        } = options;
        const storageOptions = {
            throttle,
            prefix,
            serialize,
            layers,
            errorHandling: (error): boolean => errorHandling(this, error),
        };
        this.storageOptions = storageOptions;
        this.storageProxy = disablePersist || !storage ? new NoStorageProxy() : new StorageProxy(this, storage, storageOptions);
    }

    public isRehydrated(): boolean {
        return this.rehydrated;
    }

    public restore(): Promise<ICache> {
        if (this.promisesRestore) {
            return this.promisesRestore;
        }
        this.promisesRestore = this.storageProxy
            .restore()
            .then((result) => {
                this.data = result;
                this.rehydrated = true;
                return this;
            })
            .catch((e) => {
                throw e;
            });
        return this.promisesRestore;
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

    // TODO add parameter for promises
    public set(key: string, value: any): Promise<any> {
        this.data[key] = value;
        return this.storageProxy.setItem(key, value);
    }

    public delete(key: string): Promise<any> {
        return this.set(key, null);
    }

    public remove(key: string): Promise<any> {
        delete this.data[key];
        return this.storageProxy.removeItem(key);
    }

    public getAllKeys(): Array<string> {
        return Object.keys(this.data);
    }

    public subscribe(callback: (state: any, message: any) => void): () => boolean {
        const subscription = { callback };
        const dispose = (): boolean => this.subscriptions.delete(subscription);
        this.subscriptions.add(subscription);
        return dispose;
    }

    public notify(state: any = this.toObject(), message = ''): void {
        this.subscriptions.forEach((subscription) => subscription.callback(state, message));
    }
}

export default Cache;
