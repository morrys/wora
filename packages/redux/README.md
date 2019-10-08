# [@wora/redux](https://github.com/morrys/wora)


## Installation

Install @wora/redux using yarn or npm:

```
yarn add @wora/redux
```



### Examples Persist

```ts
import { createStore, applyMiddleware, combineReducers } from '@wora/redux'
import ReduxProvider from '@wora/redux/libs/react/ReduxProvider'

const sagaMiddleware = createSagaMiddleware()

const store = createStore(
    rootReducer,
    composeWithDevTools(
      applyMiddleware(bugsnagMiddleware, analyticsMiddleware, sagaMiddleware),
    ),
    undefined,
    {
      key: 'root',
      version: 2,
      //mutateKeys?: Array<IMutateKey>
      //mutateValues?: Array<IMutateValue>
      //blacklist?: Array<string>, backward compatibility
      //whitelist?: Array<string>, backward compatibility
      //throttle?: number
      //migrate?: (PersistedState, number) => Promise<PersistedState>, backward compatibility
      //stateReconciler?: false | StateReconciler<S>, backward compatibility
    }
  )


sagaMiddleware.run(rootSaga)


<ReduxProvider store={store} loading={null}>

```

### Examples without Persist

```ts
import { createStore, applyMiddleware, combineReducers } from '@wora/redux'
import ReduxProvider from '@wora/redux/libs/react/ReduxProvider'

const sagaMiddleware = createSagaMiddleware()

const store = createStore(
    rootReducer,
    composeWithDevTools(
      applyMiddleware(bugsnagMiddleware, analyticsMiddleware, sagaMiddleware),
    ),
  )


sagaMiddleware.run(rootSaga)

<ReduxProvider store={store}>


```


### Options

[CacheOptions](https://github.com/morrys/wora/blob/master/packages/cache-persist/README.md)

### TODO

* typing, for now use redux types
* refactor

### Errors

* CREATE1: It looks like you are passing several store enhancers to createStore(). This is not supported. Instead, compose them together to a single function.
* CREATE2: Expected the enhancer to be a function.
* CREATE3: Expected the reducer to be a function.

* GETSTATE1: You may not call store.getState() while the reducer is executing. The reducer has already received the state as an argument. Pass it down from the top reducer instead of reading it from the store.

* DISPATCH1: Actions must be plain objects. Use custom middleware for async actions.
* DISPATCH2: Actions may not have an undefined "type" property. Have you misspelled a constant?
* DISPATCH3: Reducers may not dispatch actions.

* REPLACE1: Expected the nextReducer to be a function.

* OBSERVER1: Expected the observer to be an object.

* APPLY1: Dispatching while constructing your middleware is not allowed. Other middleware would not be applied to this dispatch.

* REDUCER1, actionDescription, key: Given ${actionDescription}, reducer "${key}" returned undefined. To ignore an action, you must explicitly return the previous state. If you want this reducer to hold no value, you can return null instead of undefined.
* REDUCER2: Store does not have a valid reducer. Make sure the argument passed to combineReducers is an object whose values are reducers.
* REDUCER3, key: Reducer "${key}" returned undefined during initialization. If the state passed to the reducer is undefined, you must explicitly return the initial state. The initial state may not be undefined. If you don't want to set a value for this reducer, you can use null instead of undefined.
* REDUCER4, key, ActionTypes.INIT: Reducer "${key}" returned undefined when probed with a random type. Don't try to handle ${ActionTypes.INIT} or other actions in "redux/*" namespace. They are considered private. Instead, you must return the current state for any unknown actions, unless it is undefined, in which case you must return the initial state, regardless of the action type. The initial state may not be undefined, but can be null.
