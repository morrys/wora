export type StorageHelperOptions = {
    serialize?: boolean,
    prefix?: string,
    layers?: Array<Layer<any>>
}

export type ItemCache<T> = {
    key: string,
    value: T
}

export interface Layer<T> {
    set: (key: string, value: T) => ItemCache<T>
    get: (key: string, value: T) => ItemCache<T>
    remove?: (key: string) => string
    check?: (key: string) => boolean
}

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