---
id: cache-persist
title: Cache Persist
---

**wora/cache-persist** allows you, with very little effort of work, to manage the state within your application and its persistence in storage.

All you need to know to use it is the **Cache class** and the **configurations** it makes available to you.

Let’s start right now by viewing the wora/cache-persist Cache:

```ts
export interface ICache {
    // functions to read
    get(key: string): any;
    getState(): Readonly<DataCache>;
    getAllKeys(): Array<string>;
    has(key: string): boolean;
    // functions to write
    set(key: string, value: any): void;
    delete(key: string): void;
    remove(key: string): void;
    purge(): void;
    replace(data: any): void;
    // functions to manage persistence
    isRehydrated(): boolean;
    restore(): Promise<DataCache>;
    flush(): Promise<void>;
}

export type DataCache = {
    [key: string]: any;
};
```

As you can see from the interface above, there are 3 categories of functions:

  * **to read:** these functions, synchronous, allow you to read state data
  * **to write:** these functions, synchronous, allow you to write data in the state
  * **to manage persistence:** these functions allow you to manage the persistence of state within the storage

**The read and write functions are very similar to those of the Map object, so I do not need to add anything** else while the **restore, isRehydrated and flush functions are described below** so that you better understand when and how to use them.

  * **restore: it is the most important function of all**, in fact it must necessarily be used in order to connect the store to its reference storage and initialize the cache state. Apart from special situations, e.g. Server Side Rendering, this function is recommended to be called when starting the application.
  * **flush:** this function allows you to make sure that the storage is synchronized with state data.
  * **isRehydrated:** this function lets you know if the cache has been connected with the storage via the restore function

Well, now we can see how to use the cache within our application.

### First, let’s install the packages we need:

 * wora/cache-persist using yarn or npm:

```
yarn add @wora/cache-persist
```

### Now, I can show you the simplest use case:

```ts
import { Cache } from "@wora/cache-persist";
export const cache = new Cache();

// ...
await cache.restore();
// ...

cache.set('name', 'lorenzo');
const name = cache.get('name');
```

That’s all :)

Obviously only in very rare cases are we lucky enough to have to manage such a simple case where we use the localStorage (or for ReactNative the AsyncStorage) without one of these problems:

  * How can I initialize the cache with data?
  * There is data in the storage that is not compatible with the new version of the application, how can I migrate it?
  * How can I use the same storage to manage different states? (e.g. different state based on the logged in user)
  * How can I use indexedDB?
  * How can I use session storage?
  * How can I prevent some state data from being saved within the storage?
  * How can I encrypt the data before it is saved in the storage?
  * How do I handle storage errors when saving data?

The library gives an answer to these problems (and not only these) through its configurations.

For this reason I will start by describing all its configurations and then I will show you how to use them to answer the problems indicated above


## Cache Options:

`prefix:` [Optional][Default: cache] when this option is defined, the prefixLayer mutation included in the library is used in order to add / remove the prefix to persisted keys.

`serialize:` [Optional][Default: true] when this option is true, the jsonSerialize mutation included in the library is used in order to handles JSON serialization and deserialization of values

`mutateKeys:` [Optional] with this option you can configure an array of mutation functions that will be executed in order to change the keys while writing / reading in the storage. The prefix option will insert the prefixLayer function as the first in the list.

`mutateValues:` [Optional] with this option you can configure an array of mutation functions that will be executed in order to change the values while writing / reading in the storage. The serialize option will insert the jsonSerialize function as the last in the list.

`webStorage:` [Optional][Default: local] with this option it is possible to decide to use the sessionStorage by enhancing the property with session

`storage:` [Optional][Default: localStorage/AsyncStorage] when you need to use custom storage or the indexedb, this property must be set.

`throttle:` [Optional][Default: 500] Defines the expiration interval of the debounce

`errorHandling:` [Optional] Allows you to define the callback function that is executed in case errors are raised during the write process to the storage.

`disablePersist:` [Optional][Default: false] Allows you to use the cache as an inmemory cache.

```ts
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
```

### How can I initialize the cache with data?

```ts
import { Cache } from "@wora/cache-persist";
const initialState = {
  name: "lorenzo",
}

const cache = new Cache({
  initialState,
});
// ...
await cache.restore();
// ...
const name = cache.get('name');
```

### There is data in the storage that is not compatible with the new version of the application, how can I migrate it?

```ts
import { Cache } from "@wora/cache-persist";
const initialState = {
  name: "lorenzo",
};

const  mergeState = (restoredState, initialState) => {
  const migrationState = // your logic 
  return migrationState;
};

const cache = new Cache({
  initialState,
  mergeState
});
// ...
await cache.restore();
// ...
const name = cache.get('name');
```

### How can I use the same storage to manage different states? (e.g. different state based on the logged in user)

```ts
import { Cache } from "@wora/cache-persist";

export const cacheApp = new Cache({
   prefix: 'app'
});

export getUserCache = async (user: string) => {
  const cacheUser = new Cache({
     prefix: user
  });
  await cacheUser.restore();
  return cacheUser;
}

// ...
await cacheApp.restore();
// ...
```

### How can I use indexedDB?

```ts
import {Cache, CacheStorage, CacheOptions } from "@wora/cache-persist";
import { IDBStorage } from '@wora/cache-persist/lib/idbstorage';

const idbStorages: CacheStorage[] = IDBStorage.create( {
    name: "cache", 
    storeNames: ["persist"]
});

const idb: CacheOptions = {
    storage: idbStorages[0],
    serialize: false,
}

const cache = new Cache(idb);

// ...
await cache.restore();
cache.set('name', 'lorenzo');
const name = cache.get('name')
```

### How can I use session storage?

```ts
import { Cache } from "@wora/cache-persist";

const cache = new Cache({
  webStorage: 'session',
});
// ...
await cache.restore();
// ...
const name = cache.get('name');
```

### How can I prevent some state data from being saved within the storage?

```ts
import { filterKeys } from '@wora/cache-persist/lib/layers/filterKeys';
import { IMutateKey } from '@wora/cache-persist';

const filterNoPersist: IMutateKey = filterKeys(key => !key.includes("exclude"));

const cache = new Cache({
    mutateKeys: [filterNoPersist],
});
// ...

await cache.restore();

cache.set('include', 'persist');
cache.set('exclude', 'do not persist');
```

### How can I encrypt the data before it is saved in the storage?

```ts
import { Cache, IMutateValue, mutateValuesLayer } from '@wora/cache-persist';

export const encrypt: IMutateValue = mutateValues(
    (value) => crypt(value),
    (value) => decrypt(value),
);

const cache = new Cache({
    mutateValues: [encrypt],
});
// ...

await cache.restore();

cache.set('name', 'lorenzo');
```

### How do I handle storage errors when saving data?

```ts
import { Cache } from '@wora/cache-persist';

const errorHandling = (cache: Cache, error: Error) => {
  // your logic
};

const cache = new Cache({
    errorHandling,
});
// ...

await cache.restore();

cache.set('name', 'lorenzo');
```


## What’s next
For those interested in knowing how it was implemented, I recommend reading: 
[State persistence in JavaScript — wora/cache-persist — Deep into its Source Code](https://medium.com/@morrys/state-persistence-in-javascript-wora-cache-persist-deep-into-its-source-code-56fb86147053)
