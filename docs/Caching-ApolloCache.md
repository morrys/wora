---
id: apollo-cache
title: Apollo Cache
---

This library plans to exploit the full potential of the `wora/cache-persist` cache using it as **ObjectCache** of the apollo inmemory cache.

This allows it to be **totally integrated** with the apollo logics without having to change them.

For a better integration I also opened a [issue in the apollo project](https://github.com/apollographql/apollo-feature-requests/issues/154)



## Installation

Install @wora/apollo-cache using yarn or npm:

```
yarn add @wora/apollo-cache
```



### Examples

```js
import ApolloCache from '@wora/apollo-cache';

const cache = new ApolloCache({...});

// IMPORTANT: await before instantiating ApolloClient, else queries might run before the cache is persisted
await cache.hydrate();

// Continue setting up Apollo as usual.

const client = new ApolloClient({
  cache,
  ...
});
```


### Options

* constructor(options?: InMemoryCacheConfig, persistOptions?:CacheOptions);


[CacheOptions](Caching-CachePersist.md#cache-options)