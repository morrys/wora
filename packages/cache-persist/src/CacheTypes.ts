export type ItemCache<T> = {
    key: string;
    value: T;
};

export interface IMutateKey {
    set(key: string): string | null;
    get(key: string): string | null;
}

export interface IMutateValue {
    set(value: any): any;
    get(value: any): any;
}

export type CacheOptions = {
    initialState?: DataCache;
    serialize?: boolean;
    prefix?: string | undefined | null;
    mergeState?: (restoredState?: DataCache, initialState?: DataCache) => Promise<DataCache> | DataCache;
    mutateKeys?: Array<IMutateKey>;
    mutateValues?: Array<IMutateValue>;
    storage?: ICacheStorage;
    webStorage?: 'local' | 'session';
    disablePersist?: boolean;
    errorHandling?: (cache: ICache, error: any) => boolean;
    throttle?: number;
};

export interface ICache {
    purge(): void;
    restore(): Promise<DataCache>;
    replace(data: any): void;
    isRehydrated(): boolean;
    getState(): Readonly<{ [key: string]: any }>;
    get(key: string): any;
    getStorage(): ICacheStorage;
    set(key: string, value: any): void;
    has(key: string): boolean;
    delete(key: string): void;
    remove(key: string): void;
    getAllKeys(): Array<string>;
    subscribe(callback: (state: any, action: any) => void): () => void;
    notify(payload?: { state?: any; action?: any }): void;
    flush(): Promise<void>;
}

export type DataCache = {
    [key: string]: any;
};

export interface IStorageHelper {
    restore(): Promise<DataCache | undefined>;
    push(key: string): void;
    flush(): Promise<void>;
    getStorage(): ICacheStorage;
}

export interface ICacheStorage {
    multiRemove?(keys: Array<string>): Promise<void>;
    multiGet?(keys: Array<string>): Promise<Array<Array<string>>>;
    multiSet?(items: Array<Array<string>>): Promise<void>;
    getAllKeys(): Promise<Array<string>>;
    getItem(key: string): Promise<string>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
}

export type Subscription = {
    callback(message: string, state: any): void;
};
