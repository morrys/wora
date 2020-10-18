---
id: offline-first
title: Offline First
---

# [@wora/offline-first](https://github.com/morrys/wora)


## Installation

Install @wora/offline-first using yarn or npm:

```
yarn add @wora/offline-first
```

## OfflineFirst


```ts
import { OfflineFirst, OfflineFirstOptions, OfflineRecordCache, Request } from "@wora/offline-first";

const persistOptionsStoreOffline = {
    prefix: 'example-offline',
    serialize: true,
};

asyncfunction execute(offlineRecord) {
    // ... fetch
}

async function  discard(offlineRecord) {
    // ... rollback
    return true;
}

async function complete(offlineRecord) {
    // ... commit
    return true;
}
    
const options: OfflineFirstOptions<Payload> = {
        execute: (offlineRecord: any) => execute(offlineRecord),
        finish?: (mutations: ReadonlyArray<OfflineRecordCache<T>>, error?: Error ) => undefined,
        onComplete: (options: { offlineRecord: OfflineRecordCache<T>, response: any }) => complete(options),
        onDiscard: (options: { offlineRecord: OfflineRecordCache<T>, error: any }) => discard(options),
            };

const offlineFirst = new OfflineFirst(options, persistOptionsStoreOffline);  


// ...

offlineFirst.restore().then(isRestored => setState(isRestored))

// ...

offlineFirst.publish({
    request : {
        payload: { url: '/api/todo', method: 'POST', json: { todoId } }
    }
})

```

## Options

```ts

export type OfflineFirstOptions<T> = {
    manualExecution?: boolean;
    execute: (offlineRecord: OfflineRecordCache<T>) => Promise<any>;
    start?: (mutations: Array<OfflineRecordCache<T>>) => Promise<Array<OfflineRecordCache<T>>>;
    onExecute?: (mutation: OfflineRecordCache<T>) => Promise<OfflineRecordCache<T>>;
    finish?: (mutations: ReadonlyArray<OfflineRecordCache<T>>, error?: Error) => Promise<void>;
    onComplete?: (options: { offlineRecord: OfflineRecordCache<T>; response: any }) => Promise<boolean>;
    onDiscard?: (options: { offlineRecord: OfflineRecordCache<T>; error: any }) => Promise<boolean>;
    onPublish?: (offlineRecord: OfflineRecordCache<T>) => Promise<OfflineRecordCache<T>>;
    compare?: (v1: OfflineRecordCache<T>, v2: OfflineRecordCache<T>) => number;
    // onDispatch?: (request: any) => any;
};

```
* execute: this is the only mandatory parameter. In this function, communications with the server must be implemented.

* start: function that is called once the request queue has been started.

* finish: function that is called once the request queue has been processed.

* onExecute: function that is called before the request is sent to the network.

* manualExecution: if set to true, requests in the queue are no longer performed automatically as soon as you go back online. invoke manually: `offlineFirst.process();`

* onPublish: function that is called before saving the mutation in the store

* onComplete: function that is called once the request has been successfully completed. Only if the function returns the value true, the request is deleted from the queue.

* onDiscard: function that is called when the request returns an error. Only if the function returns the value true, the mutation is deleted from the queue

## Publish

```ts

publish(options: {
        id?: string,
        request: Request<T>,
        serial?,
    }): Promise<OfflineRecordCache<T>>

```

* This is the method that must be invoked when you want to insert a request in the store. 

`request` parameter is the only mandatory one and consists of the main information useful for managing the execution of the request.

requests are executed in parallel, but with the `serial` parameter it is possible to specify whether you want to execute some or all of the requests sequentially.

## Types

```ts

export type Request<T> = {
    payload: T,
    backup?: any,
    sink?: any,
}

```

* it is advisable to use the `backup` and `sink` fields when working in contexts with optimistic responses. In order to manage any UI updates.


```ts

export type OfflineRecordCache<T> = {
    id: string,
    request: Request<T>,
    fetchTime: number,
    retry?: number,
    error?: any,
    serial?: boolean
}

```

* The parameters `fetchTime`,`retry` and `error` are managed automatically by the library during the offline process.


## This library depends exclusively on @wora/cache-persist and @wora/netinfo and I recommend using all their features and potential.
