# [@wora/apollo-offline](https://github.com/morrys/wora)


## Installation

Install @wora/apollo-offline using yarn or npm:

```
yarn add @wora/apollo-offline
```

## Installation React Web

Install @wora/apollo-offline using yarn or npm:

```
yarn add @wora/apollo-offline
```

## Installation React Native

Install react-relay and react-relay-offline using yarn or npm:

```
yarn add @react-native-community/netinfo @wora/apollo-offline
```

You then need to link the native parts of the library for the platforms you are using. The easiest way to link the library is using the CLI tool by running this command from the root of your project:

`react-native link @react-native-community/netinfo`


## Main Additional Features 

* automatic persistence and rehydration of the store (AsyncStorage, localStorage, IndexedDB) with @wora/apollo-cache

* configuration of persistence

  * custom storage

  * different key prefix (multi user)

  * serialization: JSON or none

* management and utilities for network detection with @wora/detect-network

* automatic use of the polity cache_first when the application is offline

* offline mutation management

  * update and publication of the mutation changes in the store

  * persistence of mutation information performed

  * automatic execution of mutations persisted when the application returns online

  * configurability of the offline mutation execution link

  * onComplete callback of the mutation performed successfully

  * onDiscard callback of the failed mutation


## Apollo Client with Offline Options

```ts
import { ApolloClient } from "@wora/apollo-offline";
import { HttpLink } from "apollo-link-http";
import ApolloCache from '@wora/apollo-cache';

const httpLink = new HttpLink({
  uri: "http://localhost:4000/graphql"
});

const httpLinkOffline = new HttpLink({
  uri: "http://localhost:4000/graphql"
});

const networkOffline = Network.create(fetchQueryOffline);

const offlineOptions = { 
  manualExecution: false, //optional
  link: httpLinkOffline, //optional
  onComplete: (options ) => { //optional
    const { id, offlinePayload, request } = options;
    console.log("onComplete", options);
    return true;
  },
  onDiscard: ( options ) => { //optional
    const { id, offlinePayload , error } = options;
    console.log("onDiscard", options);
    return true;
  }
};

const client = new ApolloClient({
  link: httpLink,
  cache: new ApolloCache({
    dataIdFromObject: o => o.id
  })
}, offlineOptions);


// await before instantiating Query, else queries might run before the cache is persisted, TODO ApolloProviderOffline
await client.hydrated(): Promise<boolean>

```
* manualExecution: if set to true, mutations in the queue are no longer performed automatically as soon as you go back online. invoke manually: `environment.getStoreOffline().execute();`

* link: it is possible to configure a different link for the execution of mutations in the queue

* onComplete: function that is called once the mutation has been successfully completed. Only if the function returns the value true, the mutation is deleted from the queue.

* onDiscard: function that is called when the mutation returns an error. Only if the function returns the value true, the mutation is deleted from the queue and the store is rollback




## IndexedDB

localStorage is used as the default react web persistence, while AsyncStorage is used for react-native.

To use persistence via IndexedDB:

```ts

import { HttpLink } from "apollo-link-http";
import ApolloClientIDB from '@wora/apollo-offline/lib/ApolloClientIDB';

import { HttpLink } from "apollo-link-http";

const httpLink = new HttpLink({
  uri: "http://localhost:4000/graphql"
});

const cacheOptions = {
    dataIdFromObject: o => o.id
  }

const client = ApolloClientIDB.create({ link: httpLink }, cacheOptions);
```

## ApolloClient with PersistOfflineOptions

```ts
import { ApolloClient } from "@wora/apollo-offline";
import { HttpLink } from "apollo-link-http";
import ApolloCache from '@wora/apollo-cache';

const httpLink = new HttpLink({
  uri: "http://localhost:4000/graphql"
});

const httpLinkOffline = new HttpLink({
  uri: "http://localhost:4000/graphql"
});


const persistOfflineOptions: CacheOptions = { 
  prefix: "app-user1"
};
const client = new ApolloClient({
  link: httpLink,
  cache: new ApolloCache({
    dataIdFromObject: o => o.id
  })
}, {}, persistOfflineOptions);
```

* storage?: CacheStorage;  custom storage
* prefix?: string;  prefix key in storage 
* serialize?: boolean;  if set to true, it performs JSON serialization
* encryption?: boolean;  not yet implemented in @wora/cache-persist



### Todo

* documentation

