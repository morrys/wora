---
id: relay-store
title: Relay Store
---

# [@wora/relay-store](https://github.com/morrys/wora)

## Overview

In this library the "RelayModernStore" has been extended and the "MutableRecordSource" relay-runtime interface has been implemented in order to add the following features:

* Query persistence

* Persistence of records associated with queries

* Time To Live management of queries in the store

* Define the condition to execute the garbage collector


### RecordSource

The relay-store RecordSource uses the **delegation pattern** to manage records via `wora/cache-persist` and adds the `restore` method to manage the cache restore from storage to the official interface. In this way we can manage the **persistence of records associated with queries**

```ts
export interface MutableRecordSourceOffline extends MutableRecordSource {
    restore(): Promise<Cache>
}

export default class RecordSource implements MutableRecordSourceOffline {
    private _cache: ICache;

    constructor(persistOptions: CacheOptions = {}) {
        const persistOptionsRecordSource = {
            prefix: 'relay-records',
            serialize: true,
            ...persistOptions,
        };
        this._cache = new Cache(persistOptionsRecordSource);
    }
    
    ///...

}
```

### Store

The extensions to the RelayModerStore object are listed below to add the features of **Query persistence**, **Time To Live management of queries in the store**, **Define the condition to execute the garbage collector**

#### Costructor

```ts
export type CacheOptionsStore = CacheOptions & {
    defaultTTL?: number;
};

export default class Store extends RelayModernStore {
    constructor(
        recordSource: RecordSource,
        persistOptions: CacheOptionsStore = {},
        gcScheduler?: Scheduler,
        operationLoader?: OperationLoader,
        getDataID?: any, // do not use
```


* Replaced the variable _roots: Map <number, NormalizationSelector> with _cache: Cache `wora/cache-persist`

#### Retain Method

Added the `retainConfig: {ttl: number, execute: boolean}` parameter
The **TTL value** is used to give the possibility to **specify a different TTL for each individual query**.
The **execute** value is used to **update the retainTime** of the query when set to true.

Replaced the logic of saving queries in the store. First it was managed through the **Map roots** whose **key** was an **incremental numeric value**, **now** it is managed through the **Cache object of wora/cache-persist** and the **key** is the **composition of the name of the query and its variables**.
This allows you to **avoid** having **multiple references of the same query**.


#### __gc Method

Added at the beginning of the method:

```ts
if (! this.checkGC ()) {
    return;
}
```

This is to **avoid executing the garbage collector**, we will see a **use case** in the **wora/relay-offline** library.


**Changed the check to determine** which **query** had to be **cleaned** from the **store**.

```ts
//...
const expired: boolean = !this.isCurrent(selRoot.retainTime, selRoot.ttl);
            if (!selRoot.dispose || !expired) {
                //...
            }
//...
```

 **Before it was sufficient** that the query was in the **dispose state**, **now** to be eliminated from the store **it is required** that **also its TTL has expired**.

#### add setCheckGC Method

allows you to define a custom condition to execute the garbage collector

#### add purge Method

allows you to purge the store

#### add restore Method

allows you to restore the store from storage


## Installation

Install @wora/relay-store using yarn or npm:

```
yarn add @wora/relay-store
```



### Examples

```ts
import { RecordSource, Store } from '@wora/relay-store';
import { CacheOptions } from "@wora/cache-persist";

const defaultTTL: number = 10 * 60 * 1000, // optional, default
const persistOptions: CacheOptions = {
    defaultTTL
}; // optional, default
const persistOptionsRecords: CacheOptions = {}; // optional, default
const recordSource = new RecordSource(persistOptionsRecords);
const store = new Store(recordSource, persistOptions);


// ...

// await before instantiating RelayModernEnvironment, else queries might run before the cache is persisted

await store.restore();

```


### Options

[CacheOptions](Caching-CachePersist.md#cache-options)