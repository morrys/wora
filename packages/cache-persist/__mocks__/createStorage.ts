function createStorage(type) {
    const state = {};
    return {
        getAllKeys: () => Promise.resolve(Object.keys(state)),
        setItem: (key, value) => Promise.resolve(() => { console.log("entro"); state[key] = value}),
        removeItem: (key) => Promise.resolve(() => delete state[key]),
        getItem: (key) => Promise.resolve(() => state[key]),
    };
}

module.exports = createStorage;