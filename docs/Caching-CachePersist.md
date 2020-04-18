---
id: cache-persist
title: Cache Persist
---


## Architecture

![alt-text](assets/cache-persist-architecture.png)

### Cache

The cache is the component that manages the local cache of the application and is the only component with which the application must interface.

**Allows the use of any storage in synchronous mode.** 
The only asynchronous methods they expose are:

`restore`, necessary to recover and initialize the state.

`flush`, forces data to be stored in the persistence queue

```ts
export interface ICache {
    purge(): void;
    replace(data: any): void;
    isRehydrated(): boolean;
    getState(): Readonly<{ [key: string]: any }>;
    get(key: string): any;
    set(key: string, value: any): void;
    has(key: string): boolean;
    delete(key: string): void;
    remove(key: string): void;
    getAllKeys(): Array<string>;
    subscribe(callback: (state: any, action: any) => void): () => void;
    notify(payload?: { state?: any; action?: any }): void;
    getStorage(): ICacheStorage;
    restore(): Promise<DataCache>;
    flush(): Promise<void>;
}
```

### Storage Proxy

The proxy storage is the intermediary that connects the local cache to the storage.

### Middleware Layer

In the middleware level there are all the transformation and verification logics that are performed during the communication between the cache and the storage.

The layers currently available within the library are:

* **prefixLayer**: layer that handles the key prefix (<prefix>. <originalkey>), is inserted as the first layer when the **prefix option** is different from null 

* **jsonSerialize**:  layer that handles JSON serialization and deserialization of values, is inserted as the last layer when the **serialize option** is true

* **filterKeys**: this layer allows you to define a function to determine which keys persist.


It is possible to implement any other layer component by implementing the interface described below:

```ts
export interface IMutateKey {
    set(key: string): string | null;
    get(key: string): string | null;
}

export interface IMutateValue {
    set(value: any): any;
    get(value: any): any;
}
```


### Storage

Inside the library there is the possibility to use the following storage: 

**localStorage (web default)**

**AsyncStorage (default react-native)**

**sessionStorage**

**IndexedDB**


If you need to use different storage than those currently provided, simply create a customized storage that implements the following interface:

```ts
export interface ICacheStorage {
    multiRemove?(keys: Array<string>): Promise<void>;
    multiGet?(keys: Array<string>): Promise<Array<Array<string>>>;
    multiSet?(items: Array<Array<string>>): Promise<void>;
    getAllKeys(): Promise<Array<string>>;
    getItem(key: string): Promise<string>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
}
```


## Installation

Install @wora/cache-persist using yarn or npm:

```
yarn add @wora/cache-persist
```

## Cache Options

```ts
export type CacheOptions = {
    serialize?: boolean;
    prefix?: string | undefined | null;
    initialState?: DataCache;
    mergeState?: (restoredState?: DataCache, initialState?: DataCache) => Promise<DataCache> | DataCache;
    mutateKeys?: Array<IMutateKey>;
    mutateValues?: Array<IMutateValue>;
    storage?: ICacheStorage;
    webStorage?: 'local' | 'session';
    disablePersist?: boolean;
    errorHandling?: (cache: ICache, error: any) => boolean;
    throttle?: number;
};
```

* **storage:** custom storage, localStorage is used as the default react web persistence, while AsyncStorage is used for react-native.
 
* **mergeState:** callback called during the restore that allows to merge the data recovered from the store and the initial data.

* **prefix:** prefix keys, default "cache" (use the prefixLayer as first mutateKeys)

* **serialize:** if it is true, the data will be serialized and deserialized JSON (use the jsonSerialize as last mutateValues)

* **webStorage:** local for localStorage, session for sessionStorage. default local

* **disablePersist:** if it is true, nostorage is used

* **mutateKeys:** it is possible to configure which functions will change the keys (eg filterKeys)

* **mutateValues:** it is possible to configure which functions will change the values (eg filterKeys)

* **throttle:** waiting time for data storage

* **errorHandling:** callback performed in case of errors during store saving


## Usage default
```ts
import { Cache } from "@wora/cache-persist";
const cache = new Cache();
cache.restore().then(() => {
    const state = cache.getState();
});
```

## Usage indexedDB

```ts
import {Cache, CacheStorage, CacheOptions } from "@wora/cache-persist";
import { IDBStorage } from '@wora/cache-persist/lib/idbstorage';

const idbStorages: CacheStorage[] = IDBStorage.create( {
    name: "cache", 
    storeNames: ["persist", "persist2"]
});

const idb: CacheOptions = {
        storage: idbStorages[0],
        serialize: false,
    }

const idb1: CacheOptions = {
        storage: idbStorages[1],
        serialize: false,
    }

const cacheidb = new Cache(idb);
cacheidb.restore().then(() => {
    const state = cacheidb.getState();
});

const cacheidb1 = new Cache(idb1);
cacheidb1.restore().then(() => {
    const state = cacheidb1.getState();
});
```

### Example use filterKeys Layer

```ts
import { filterKeys }  from '@wora/cache-persist/lib/layers/filterKeys';
import { IMutateKey } from '@wora/cache-persist';

const filterPersistAuth: IMutateKey = filterKeys(key => key.includes("auth"));

const filterNoPersistAuth: IMutateKey = filterKeys(key => !key.includes("auth"));

const CacheLocal1 = new Cache({
    mutateKeys: [filterNoPersistAuth],
    prefix: 'cache1',
});

const CacheLocal2 = new Cache({
    mutateKeys: [filterPersistAuth],
    prefix: 'cache2',
});
```

## Subscribe and notify example with hooks

```ts
import * as React from 'react';
import { useEffect, useState } from 'react';
import { DataCache } from '@wora/cache-persist';

const [result, setResult] = useState<{loading: boolean, data: DataCache}>({loading: true, data: {}});

 useEffect(() => {
    const dispose = cache.subscribe((state, action) => {
      setResult({loading: false, data: state});
    });
    cache.restore().then(() => {
      cache.notify({ action: "restored" });
    })
    return () => dispose();
    
  },
    []);
```
