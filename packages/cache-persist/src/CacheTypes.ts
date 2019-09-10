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
    set: (key: string, value: any) => Array<string>;
    get: (key: string, value: any) => Array<string>;
    remove?: (key: string) => string;
    check?: (key: string) => boolean;
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
    purge: () => Promise<boolean>;
    restore: () => Promise<DataCache>;
    replace: (data: any) => Promise<void>;
    isRehydrated: () => boolean;
    clear: () => Promise<boolean>;
    getState: () => Readonly<{ [key: string]: any }>;
    toObject: () => Readonly<{ [key: string]: any }>;
    get: (key: string) => any;
    set: (key: string, value: any) => Promise<any>;
    delete: (key: string) => Promise<any>;
    remove: (key: string) => Promise<any>;
    getAllKeys: () => Array<string>;
    subscribe: (callback: (message: string, state: any) => void) => () => void;
    notify: (message: string) => void;
}

export type DataCache = {
    [key: string]: any;
};

export interface IStorageHelper {
    purge: () => Promise<boolean>;
    restore: () => Promise<DataCache>;
    replace: (data: any) => Promise<void>;
    setItem: (key: string, item: string | object) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
}

export interface ICacheStorage {
    multiRemove?: (keys: Array<string>) => Promise<void>;
    multiGet?: (keys: Array<string>) => Promise<Array<Array<string>>>;
    multiSet?: (items: Array<Array<string>>) => Promise<void>;
    getAllKeys: () => Promise<Array<string>>;
    getItem: (key: string) => Promise<string>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
}

export type Subscription = {
    callback: (message: string, state: any) => void;
};
