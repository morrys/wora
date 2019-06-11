# cache-persist
cache-persist


## Installation

Install cache-persist using yarn or npm:

```
yarn add cache-persist
```

## Options
CacheOptions {
    storage?: Cache, 
    prefix?: string, 
    serialize?: boolean
}


storage: custom storage

prefix: prefix keys

serialize: if it is true, the data will be serialized and deserialized JSON 


## Cache
isRehydrated(): boolean; // true if restored

restore(): Promise<Cache>; // restore storage, set rehydratad
    
getStorageName(): string;  // storage name

purge(): void; // purge state and storage

getState(): Readonly<{v[key: string]: any; }>; // return in memory state

get(key: string): any; // get value from in memory state

getAllKeys(): Array<string>; // getAllKeys value from in memory state
    
set(key: string, value: any): Promise<any>; // set value in state (sync) and in storage (async)
    
delete(key: string): Promise<any>; // delete value in state (sync) and in storage (async)
    
remove(key: string): Promise<any>; // remove value in state (sync) and in storage (async)
    


## Usage default
```ts
import { Cache } from "cache-persist";
const cache = new Cache();
cache.restore().then(() => {
    const state = cache.getState();
});
```

## Usage indexedDB

```ts
import Cache, { CacheStorage, CacheOptions } from "cache-persist";
import IDBStorage from 'cache-persist/lib/idbstorage';

const idbStorages: CacheStorage[] = IDBStorage.create("cache", ["persist", "persist2"]);

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
## Hooks example

```ts
import * as React from 'react';
import { useEffect, useState } from 'react';
import { DataCache } from 'cache-persist';

const [result, setResult] = useState<{loading: boolean, data: DataCache}>({loading: true, data: {}});

  useEffect(() => {
    cache.restore().then(() => setResult({loading: false, data: cache.getState()}))
  },
    []);
```
