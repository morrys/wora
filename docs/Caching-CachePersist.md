---
id: cache-persist
title: Cache Persist
---


## Architecture

![alt-text](assets/cache-persist-architecture.png).

# [@wora/cache-persist](https://github.com/morrys/wora)


## Installation

Install @wora/cache-persist using yarn or npm:

```
yarn add @wora/cache-persist
```

## Options
CacheOptions {
    serialize?: boolean,
    prefix?: string | undefined | null,
    layers?: Array<Layer<any>>,
    storage?: CacheStorage, 
    webStorage?: "local" | "session",
    disablePersist?: boolean
}

storage: custom storage, localStorage is used as the default react web persistence, while AsyncStorage is used for react-native.

prefix: prefix keys, default cache

serialize: if it is true, the data will be serialized and deserialized JSON 

webStorage: local for localStorage, session for sessionStorage. default local

disablePersist: if it is true, nostorage is used

layers: todo documentation (data encryption ecc..)


## Cache
isRehydrated(): boolean; // true if restored

replace(data: any): 

restore(): Promise<Cache>; // restore storage, set rehydratad
    
getStorageName(): string;  // storage name

purge(): Promise<boolean>; // purge state and storage

clear(): Promise<boolean>; // purge state and storage

getState(): Readonly<{v[key: string]: any; }>; // return in memory state

toObject(): Readonly<{v[key: string]: any; }>; // return in memory state

get(key: string): any; // get value from in memory state

getAllKeys(): Array<string>; // getAllKeys value from in memory state
    
set(key: string, value: any): Promise<any>; // set value in state (sync) and in storage (async)
    
delete(key: string): Promise<any>; // delete value in state (sync) and in storage (async)
    
remove(key: string): Promise<any>; // remove value in state (sync) and in storage (async)

subscribe( callback: (message: string, state: any) => void, ): () => void // subscription management

notify(message: string = "notify data"): void // notification of the message and status to all subscriptions
    


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
import Cache, { CacheStorage, CacheOptions } from "@wora/cache-persist";
import IDBStorage from '@wora/cache-persist/lib/idbstorage';

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

## Layer


```ts
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
```

set: called before persisting an item in the storage
get: called before restoring item in the cache 
remove: called before removing an item from the storage
check: called to check if the item in the storage belongs to the cache

### layers provided within the library

* prefixLayer: layer that handles the key prefix, is inserted as the first layer when the prefix option is different from null

* jsonSerialize: layer that handles JSON serialization and deserialization of values, is inserted as the last layer when the serialize option is true

* filterKeys: this layer allows you to define a function to determine which keys persist.

```ts
import filterKeys  from '@wora/cache-persist/lib/layers/filterKeys';

const filterPersistAuth: Layer<any> = filterKeys(key => key.includes("auth"));

const filterNoPersistAuth: Layer<any> = filterKeys(key => !key.includes("auth"));

const CacheLocal1 = new Cache({
    layers: [filterNoPersistAuth],
    prefix: 'cache1',
});

const CacheLocal2 = new Cache({
    layers: [filterPersistAuth],
    prefix: 'cache2',
});
```

## Storage

### do you want to create your own storage? It is sufficient to implement this interface

```ts
export interface Storage {
    multiRemove: (keys: Array<string>) => Promise<void>,
    multiGet: (keys: Array<string>) => Promise<DataCache>,
    getAllKeys: () => Promise<Array<string>>,
    multiSet: (items: Array<ItemCache<any>>) => Promise<void>,
    setItem: (key: string, value: string) => Promise<void>,
    removeItem: (key: string) => Promise<void> 
}
```

## Hooks example

```ts
import * as React from 'react';
import { useEffect, useState } from 'react';
import { DataCache } from '@wora/cache-persist';

const [result, setResult] = useState<{loading: boolean, data: DataCache}>({loading: true, data: {}});

 useEffect(() => {
    const dispose = cache.subscribe((message, state) => {
      setResult({loading: false, data: state});
    });
    cache.restore().then(() => {
      cache.notify("restored");
    })
    return () => dispose();
    
  },
    []);
```
