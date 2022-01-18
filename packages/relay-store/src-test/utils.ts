export function createPersistedRecordSource(clientState = {}): any {
    return createPersistedStorage('relay-records', clientState);
}

export function createPersistedStore(clientState = {}): any {
    return createPersistedStorage('relay-store', clientState);
}

export function createPersistedStorage(prefix, clientState = {}): any {
    const state = {};
    Object.keys(clientState).forEach((key) => (state[prefix + '.' + key] = JSON.stringify(clientState[key])));
    return {
        getAllKeys: () => Promise.resolve(Object.keys(state)),
        setItem: (_key, _value) => Promise.resolve(),
        removeItem: (key) => Promise.resolve(delete state[key]),
        getItem: (key) => Promise.resolve(state[key]),
        getState: () => state,
    } as any;
}
