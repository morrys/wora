# [@wora/relay-store](https://github.com/morrys/wora)


## Installation

Install @wora/relay-store using yarn or npm:

```
yarn add @wora/relay-store
```



### Examples

```ts
import { Store } from '@wora/relay-store';
import { CacheOptions } from "@wora/cache-persist";

const defaultTTL: number = 10 * 60 * 1000, // optional, default
const persistOptions: CacheOptions = {}; // optional, default
const persistOptionsRecords: CacheOptions = {}; // optional, default
const store = new Store(defaultTTL, persistOptions, persistOptionsRecords);


// ...

// await before instantiating ApolloClient, else queries might run before the cache is persisted
await cache.restore();

```


### Options

[CacheOptions](https://github.com/morrys/wora/blob/master/packages/cache-persist/README.md)
