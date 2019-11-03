import StorageProxy from './StorageProxy';
import { DataCache, ICache, Subscription, CacheOptions, IStorageHelper, ICacheStorage } from './CacheTypes';

const hasOwn = Object.prototype.hasOwnProperty;

class Cache implements ICache {
    private data: DataCache;
    private rehydrated = false;
    private subscriptions: Set<Subscription> = new Set();
    private storageProxy: IStorageHelper;
    private promisesRestore;
    private mergeState: (restoredState: DataCache, initialState: DataCache) => Promise<DataCache> | DataCache;

    constructor(options?: CacheOptions) {
        this.storageProxy = StorageProxy(this, options);
        this.rehydrated = !this.storageProxy.getStorage();
        this.data = options && options.initialState ? options.initialState : {};
        this.mergeState =
            options && options.mergeState
                ? options.mergeState
                : (restoredState, initialState): DataCache => (restoredState ? restoredState : initialState);
    }

    public getStorage(): ICacheStorage {
        return this.storageProxy.getStorage();
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
            .then((restoredState) => Promise.all([restoredState, this.mergeState(restoredState, this.data)]))
            .then(([restoredState, newState]) => {
                this.data = newState;
                if (restoredState !== newState) {
                    this.replace(newState);
                    return this.flush();
                }
            })
            .then(() => {
                this.rehydrated = true;
                return this;
            })
            .catch((e) => {
                this.promisesRestore = null;
                throw e;
            });
        return this.promisesRestore;
    }

    public replace(newData: DataCache): void {
        const keys = this.getAllKeys().concat(Object.keys(newData));
        this.data = Object.assign({}, newData);
        keys.forEach((key) => this.storageProxy.push(key));
        //return this.storageProxy.replace(newData);
    }

    public purge(): void {
        const keys = this.getAllKeys();
        this.data = Object.create(null);
        keys.forEach((key) => this.storageProxy.push(key));
    }

    // Relay: For performance problems, it is advisable to return the state directly.
    public getState(): Readonly<{ [key: string]: any }> {
        return this.data;
    }

    public has(key: string): boolean {
        return hasOwn.call(this.data, key);
    }

    public get(key: string): any {
        return this.data[key];
    }

    public set(key: string, value: any): void {
        this.data[key] = value;
        this.storageProxy.push(key);
    }

    public delete(key: string): void {
        this.set(key, null);
    }

    public remove(key: string): void {
        delete this.data[key];
        this.storageProxy.push(key);
    }

    public flush(): Promise<void> {
        return this.storageProxy.flush();
    }

    public getAllKeys(): Array<string> {
        return Object.keys(this.data);
    }

    public subscribe(callback: (state: any, action: any) => void): () => boolean {
        const subscription = { callback };
        const dispose = (): boolean => this.subscriptions.delete(subscription);
        this.subscriptions.add(subscription);
        return dispose;
    }

    public notify(payload: { state?: any; action?: any } = {}): void {
        const { state = this.getState(), action = '' } = payload;
        this.subscriptions.forEach((subscription) => subscription.callback(state, action));
    }
}

export default Cache;
