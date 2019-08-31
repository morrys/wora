export type StorageHelperOptions = {
    serialize?: boolean,
    prefix?: string,
    layers?: Array<Layer>,
    errorHandling?: (error: any) => boolean,
}

export type ItemCache<T> = {
    key: string,
    value: T
}

export interface Layer {
    set: (key: string, value: any) => string[]
    get: (key: string, value: any) => string[]
    remove?: (key: string) => string
    check?: (key: string) => boolean
}

export type CacheOptions = {
    serialize?: boolean,
    prefix?: string | undefined | null,
    layers?: Array<Layer>,
    storage?: CacheStorage, 
    webStorage?: "local" | "session",
    disablePersist?: boolean,
    errorHandling?: (error: any) => boolean,
}

export type DataCache = {
    [key: string]: any
}

export interface StorageHelper {
    purge: () => Promise<boolean>;
    restore: () => Promise<DataCache>;
    replace: (data: any) => Promise<void>;
    setItem: (key: string, item: string | object) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
}

export interface CacheStorage {
    multiRemove: (keys: Array<string>) => Promise<void>,
    multiGet: (keys: Array<string>) => Promise<DataCache>,
    getAllKeys: () => Promise<Array<string>>,
    multiSet: (items: string[][]) => Promise<void>,
    setItem: (key: string, value: string) => Promise<void>,
    removeItem: (key: string) => Promise<void> 
}

export type Subscription = {
    callback: (message: string, state: any) => void,
};