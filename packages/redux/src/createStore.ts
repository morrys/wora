import $$observable from 'symbol-observable';
import Cache, { ICache, CacheOptions } from '@wora/cache-persist';
import isPlainObject from './redux/utils/isPlainObject';
import ActionTypes from './redux/utils/actionTypes';
import filterKeys from '@wora/cache-persist/lib/layers/filterKeys';

export const REHYDRATE = `@@redux/RESTORED`; // added

/**
 * Creates a Redux store that holds the state tree.
 * The only way to change the data in the store is to call `dispatch()` on it.
 *
 * There should only be a single store in your app. To specify how different
 * parts of the state tree respond to actions, you may combine several reducers
 * into a single reducer function by using `combineReducers`.
 *
 * @param {Function} reducer A function that returns the next state tree, given
 * the current state tree and the action to handle.
 *
 * @param {any} [preloadedState] The initial state. You may optionally specify it
 * to hydrate the state from the server in universal apps, or to restore a
 * previously serialized user session.
 * If you use `combineReducers` to produce the root reducer function, this must be
 * an object with the same shape as `combineReducers` keys.
 *
 * @param {Function} [enhancer] The store enhancer. You may optionally specify it
 * to enhance the store with third-party capabilities such as middleware,
 * time travel, persistence, etc. The only store enhancer that ships with Redux
 * is `applyMiddleware()`.
 *
 * @returns {Store} A Redux store that lets you read the state, dispatch actions
 * and subscribe to changes.
 */
export type CacheOptionsRedux = CacheOptions & {
    version?: number;
    key?: string;
    whitelist?: Array<string>;
    blacklist?: Array<string>;
    migrate?: (s: any, v: number) => Promise<any>;
    stateReconciler?: (s: any, o: any, r: any, c: any) => any;
};

function createStore(reducer: any, preloadedState?: any, enhancer?: any, persistOptions?: CacheOptionsRedux) {
    //TODO TYPING

    if (
        (typeof preloadedState === 'function' && typeof enhancer === 'function') ||
        (typeof enhancer === 'function' && typeof arguments[3] === 'function')
    ) {
        throw new Error('CREATE1');
    }

    if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
        enhancer = preloadedState;
        preloadedState = undefined;
    }

    if (typeof enhancer !== 'undefined') {
        if (typeof enhancer !== 'function') {
            throw new Error('CREATE2');
        }

        return enhancer(createStore)(reducer, preloadedState, undefined, persistOptions);
    }

    if (typeof reducer !== 'function') {
        throw new Error('CREATE3');
    }

    const {
        disablePersist = !persistOptions,
        version = -1,
        key = 'root', // TODO verify
        whitelist = undefined,
        blacklist = undefined,
        mutateKeys = undefined,
        mutateValues = undefined,
        migrate = (s: any, v: number) => Promise.resolve(s),
        stateReconciler = (s: any, o: any, r: any, c: any) => s,
    } = persistOptions || {};

    const internalMutateKeys = [];
    const prefix = `persist:${key}`;
    if (whitelist) {
        internalMutateKeys.push(filterKeys((key) => whitelist.includes(key)));
    }
    if (blacklist) {
        internalMutateKeys.push(filterKeys((key) => !blacklist.includes(key)));
    }

    const customMutateKeys = mutateKeys ? internalMutateKeys.concat(mutateKeys) : internalMutateKeys;

    const cache: ICache = new Cache({
        disablePersist,
        prefix,
        mutateKeys: customMutateKeys,
        mutateValues,
        ...persistOptions,
    });

    let currentReducer = reducer;
    let isDispatching = false;

    /**
     * Reads the state tree managed by the store.
     *
     * @returns {any} The current state tree of your application.
     */
    function getState() {
        if (isDispatching) {
            throw new Error('GETSTATE1');
        }
        return cache.getState();
    }

    /**
     * Adds a change listener. It will be called any time an action is dispatched,
     * and some part of the state tree may potentially have changed. You may then
     * call `getState()` to read the current state tree inside the callback.
     *
     * You may call `dispatch()` from a change listener, with the following
     * caveats:
     *
     * 1. The subscriptions are snapshotted just before every `dispatch()` call.
     * If you subscribe or unsubscribe while the listeners are being invoked, this
     * will not have any effect on the `dispatch()` that is currently in progress.
     * However, the next `dispatch()` call, whether nested or not, will use a more
     * recent snapshot of the subscription list.
     *
     * 2. The listener should not expect to see all state changes, as the state
     * might have been updated multiple times during a nested `dispatch()` before
     * the listener is called. It is, however, guaranteed that all subscribers
     * registered before the `dispatch()` started will be called with the latest
     * state by the time it exits.
     *
     * @param {Function} listener A callback to be invoked on every dispatch.
     * @returns {Function} A function to remove this change listener.
     */
    function subscribe(listener: any) {
        return cache.subscribe(listener);
    }

    /**
     * Dispatches an action. It is the only way to trigger a state change.
     *
     * The `reducer` function, used to create the store, will be called with the
     * current state tree and the given `action`. Its return value will
     * be considered the **next** state of the tree, and the change listeners
     * will be notified.
     *
     * The base implementation only supports plain object actions. If you want to
     * dispatch a Promise, an Observable, a thunk, or something else, you need to
     * wrap your store creating function into the corresponding middleware. For
     * example, see the documentation for the `redux-thunk` package. Even the
     * middleware will eventually dispatch plain object actions using this method.
     *
     * @param {Object} action A plain object representing “what changed”. It is
     * a good idea to keep actions serializable so you can record and replay user
     * sessions, or use the time travelling `redux-devtools`. An action must have
     * a `type` property which may not be `undefined`. It is a good idea to use
     * string constants for action types.
     *
     * @returns {Object} For convenience, the same action object you dispatched.
     *
     * Note that, if you use a custom middleware, it may wrap `dispatch()` to
     * return something else (for example, a Promise you can await).
     */
    function dispatch(action: any) {
        if (!isPlainObject(action)) {
            throw new Error('DISPATCH1');
        }

        if (typeof action.type === 'undefined') {
            throw new Error('DISPATCH2');
        }

        if (isDispatching) {
            throw new Error('DISPATCH3');
        }

        try {
            isDispatching = true;
            const { _persist, ...prevState } = cache.getState();
            const state = currentReducer(prevState, action);
            Object.keys(state).forEach((key) => {
                if (state[key] !== prevState[key]) {
                    cache.set(key, state[key]);
                }
            });
        } finally {
            isDispatching = false;
        }

        cache.notify({ state: getState(), action });
        return action;
    }

    /**
     * Replaces the reducer currently used by the store to calculate the state.
     *
     * You might need this if your app implements code splitting and you want to
     * load some of the reducers dynamically. You might also need this if you
     * implement a hot reloading mechanism for Redux.
     *
     * @param {Function} nextReducer The reducer for the store to use instead.
     * @returns {void}
     */
    function replaceReducer(nextReducer: any) {
        if (typeof nextReducer !== 'function') {
            throw new Error('REPLACE1');
        }

        currentReducer = nextReducer;

        // This action has a similiar effect to ActionTypes.INIT.
        // Any reducers that existed in both the new and old rootReducer
        // will receive the previous state. This effectively populates
        // the new state tree with any relevant data from the old one.
        dispatch({ type: ActionTypes.REPLACE });
    }

    /**
     * Interoperability point for observable/reactive libraries.
     * @returns {observable} A minimal observable of state changes.
     * For more information, see the observable proposal:
     * https://github.com/tc39/proposal-observable
     */
    function observable() {
        const outerSubscribe = subscribe;
        return {
            /**
             * The minimal observable subscription method.
             * @param {Object} observer Any object that can be used as an observer.
             * The observer object should have a `next` method.
             * @returns {subscription} An object with an `unsubscribe` method that can
             * be used to unsubscribe the observable from the store, and prevent further
             * emission of values from the observable.
             */
            subscribe(observer: any) {
                if (typeof observer !== 'object' || observer === null) {
                    throw new TypeError('OBSERVER1');
                }

                function observeState() {
                    if (observer.next) {
                        observer.next(getState());
                    }
                }

                observeState();
                const unsubscribe = outerSubscribe(observeState);
                return { unsubscribe };
            },

            [$$observable]() {
                return this;
            },
        };
    }

    function isRehydrated(): boolean {
        return cache.isRehydrated();
    }

    function restore(): Promise<void> {
        if (disablePersist) {
            dispatch({ type: ActionTypes.INIT });
            return Promise.resolve();
        } else {
            return cache
                .restore()
                .then(async () => {
                    /*const checkReduxPersistStore = cache.getState();
                    // TODO migration redux-persist
                        cache.replace(checkReduxPersistStore);
                    */
                    const restoredState = cache.getState();

                    dispatch({ type: ActionTypes.INIT });
                    const haveStoredState = !!restoredState && !!restoredState._persist;
                    const migrateState =
                        haveStoredState &&
                        (await migrate(restoredState, version).then((mState: any, state: any = getState()) => {
                            return stateReconciler(mState, preloadedState, state, persistOptions);
                        }));
                    const state = { ...migrateState, _persist: { version, rehydrated: true, wora: true } };

                    cache.replace(state);
                    await cache.flush();
                    dispatch({ type: REHYDRATE });
                })
                .catch((error) => {
                    throw error;
                });
        }
    }

    // When a store is created, an "INIT" action is dispatched so that every
    // reducer returns their initial state. This effectively populates
    // the initial state tree.

    return {
        dispatch,
        subscribe,
        getState,
        replaceReducer,
        restore,
        isRehydrated,
        [$$observable]: observable,
    };
}

export default createStore;
