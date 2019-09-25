export type StorageHelperOptions = {
    serialize?: boolean;
    prefix?: string;
    layers?: Array<ILayer>;
    errorHandling?: (error: any) => boolean;
    throttle?: number;
};

export type ItemCache<T> = {
    key: string;
    value: T;
};

export interface ILayer {
    set: (key: string, value: any) => Array<string> | null;
    get: (key: string, value: any) => Array<string> | null;
    remove?: (key: string) => string | null;
    check?: (key: string) => string | null;
}

export type CacheOptions = {
    serialize?: boolean;
    prefix?: string | undefined | null;
    layers?: Array<ILayer>;
    storage?: ICacheStorage;
    webStorage?: 'local' | 'session';
    disablePersist?: boolean;
    errorHandling?: (cache: ICache, error: any) => boolean;
    throttle?: number;
};

export interface ICache {
    purge(): Promise<boolean>;
    restore(): Promise<DataCache>;
    replace(data: any): Promise<void>;
    isRehydrated(): boolean;
    clear(): Promise<boolean>;
    getState(): Readonly<{ [key: string]: any }>;
    toObject(): Readonly<{ [key: string]: any }>;
    get(key: string): any;
    set(key: string, value: any, promise?: boolean): void | Promise<void>;
    set(key: string, value: any, promise: true): Promise<void>;
    set(key: string, value: any): void;
    delete(key: string, promise?: boolean): void | Promise<void>;
    delete(key: string, promise: true): Promise<void>;
    delete(key: string): void;
    remove(key: string, promise?: boolean): void | Promise<void>;
    remove(key: string, promise: true): Promise<void>;
    remove(key: string): void;
    getAllKeys(): Array<string>;
    subscribe(callback: (state: any, action: any) => void): () => void;
    notify(payload?: { state?: any; action?: any }): void;
}

export type DataCache = {
    [key: string]: any;
};

export interface IStorageHelper {
    purge(): Promise<boolean>;
    restore(): Promise<DataCache>;
    replace(data: any): Promise<void>;
    setItem(key: string, value: any, promise: true): Promise<void>;
    setItem(key: string, value: any): void;
    removeItem(key: string, promise: true): Promise<void>;
    removeItem(key: string): void;
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

export type Observer<T> = {
    start?: (subscription: Subscription) => any;
    next?: (value?: T) => any;
    error?: (error: Error) => any;
    complete?: () => any;
    unsubscribe?: (subscription: Subscription) => any;
};
