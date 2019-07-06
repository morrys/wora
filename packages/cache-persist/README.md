# [@wora/cache-persist](https://github.com/morrys/wora)


## Installation

Install @wora/cache-persist using yarn or npm:

```
yarn add @wora/cache-persist
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
