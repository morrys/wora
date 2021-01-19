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


#### add setCheckGC Method

allows you to define a custom condition to execute the garbage collector

#### add purge Method

allows you to purge the store

#### add hydrate Method

allows you to hydrate the store from storage


## Installation

Install @wora/relay-store using yarn or npm:

```
yarn add @wora/relay-store
```



### Examples

```ts
import { RecordSource, Store } from '@wora/relay-store';
import { CacheOptions } from "@wora/cache-persist";
import { Environment } from 'relay-runtime';

const defaultTTL: number = 10 * 60 * 1000; // optional, default
const persistOptionsRecords: CacheOptions = {}; // optional, default
const recordSource = new RecordSource(persistOptionsRecords);
const persistOptions: CacheOptions = { }; // optional, default
const store = new Store(recordSource, {}, { queryCacheExpirationTime: defaultTTL });
const environment = new Environment({network, store});

// ...

await store.hydrate();

```


### Options

[CacheOptions](Caching-CachePersist.md#cache-options)