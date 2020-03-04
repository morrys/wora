# [@wora/relay-store](https://github.com/morrys/wora)


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
const persistOptions: CacheOptions = { defaultTTL }; // optional, default
const persistOptionsRecords: CacheOptions = {}; // optional, default
const recordSource = new RecordSource(persistOptionsRecords);
const store = new Store(recordSource, persistOptions);
const environment = new Environment({network, store});

// ...

await store.hydrate();

```


### Options

[CacheOptions](https://github.com/morrys/wora/blob/master/packages/cache-persist/README.md)
