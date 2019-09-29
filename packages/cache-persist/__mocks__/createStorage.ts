function createStorage(type) {
    const state = { 'cache.restore': true, 'cache.cavolo': 1 };
    return {
        getAllKeys: () => Promise.resolve(Object.keys(state)),
        setItem: (key, value) => Promise.resolve((state[key] = value)),
        removeItem: (key) => Promise.resolve(delete state[key]),
        getItem: (key) => Promise.resolve(state[key]),
        getState: () => state,
    };
}

export default createStorage;
