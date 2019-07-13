# [@wora/apollo-cache](https://github.com/morrys/wora)


## Installation

Install @wora/apollo-cache using yarn or npm:

```
yarn add @wora/apollo-cache
```



### Examples

```js
import ApolloCache from '@wora/apollo-cache';

const cache = new ApolloCache({...});

// await before instantiating ApolloClient, else queries might run before the cache is persisted
await cache.hydrated();

// Continue setting up Apollo as usual.

const client = new ApolloClient({
  cache,
  ...
});
```


### Options

* constructor(options?: InMemoryCacheConfig, persistOptions?:CacheOptions);


[CacheOptions](https://github.com/morrys/wora/blob/master/packages/cache-persist/README.md)
