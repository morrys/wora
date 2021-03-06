import { compose } from '@wora/cache-persist';

/**
 * Creates a store enhancer that applies middleware to the dispatch method
 * of the Redux store. This is handy for a variety of tasks, such as expressing
 * asynchronous actions in a concise manner, or logging every action payload.
 *
 * See `redux-thunk` package as an example of the Redux middleware.
 *
 * Because middleware is potentially asynchronous, this should be the first
 * store enhancer in the composition chain.
 *
 * Note that each middleware will be given the `dispatch` and `getState` functions
 * as named arguments.
 *
 * @param {...Function} middlewares The middleware chain to be applied.
 * @returns {Function} A store enhancer applying the middleware.
 */
const applyMiddleware = (...middlewares) => {
    return (createStore) => (...args) => {
        const store = createStore(...args);
        let dispatch: any = () => {
            throw new Error('APPLY1');
        };

        const middlewareAPI = {
            getState: store.getState,
            dispatch: (...args) => dispatch(...args),
        };
        const chain = middlewares.map((middleware) => middleware(middlewareAPI));
        dispatch = compose(...chain)(store.dispatch);

        return {
            ...store,
            dispatch,
        };
    };
};

export default applyMiddleware;
