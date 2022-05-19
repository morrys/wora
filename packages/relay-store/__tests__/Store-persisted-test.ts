import { Store as RelayModernStore, RecordSource as WoraRecordSource } from '../src';

import { createOperationDescriptor, graphql, REF_KEY } from 'relay-runtime';
import { simpleClone } from 'relay-test-utils-internal';
import { createPersistedRecordSource, createPersistedStore } from '../src-test';
//jest.useFakeTimers();

const getRecordSourceImplementation = (data): any =>
    new WoraRecordSource({ storage: createPersistedRecordSource({ ...data }), initialState: { ...data } });
const ImplementationName = 'Wora Persist';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const userFragment: any = graphql`
    fragment StorePersistedTestUserFragment on User {
        name
        profilePicture(size: $size) {
            uri
        }
    }
`;
const UserQuery: any = graphql`
    query StorePersistedTestUserQuery($id: ID!, $size: [Int]) {
        node(id: $id) {
            ...StorePersistedTestUserFragment
        }
    }
`;
const flushPromises = function flushPromises() {
    return new Promise((resolve) => setImmediate(resolve));
};

describe(`Relay Store with ${ImplementationName} Record Source`, () => {
    describe('backward compatibility persisted retain()', () => {
        let data;
        let initialData;
        let source;
        let store;

        beforeEach(async () => {
            data = {
                '4': {
                    __id: '4',
                    id: '4',
                    __typename: 'User',
                    name: 'Zuck',
                    'profilePicture(size:32)': { [REF_KEY]: 'client:1' },
                },
                'client:1': {
                    __id: 'client:1',
                    uri: 'https://photo1.jpg',
                },
                'client:root': {
                    __id: 'client:root',
                    __typename: '__Root',
                    'node(id:"4")': { __ref: '4' },
                },
            };
            initialData = simpleClone(data);

            const operation = createOperationDescriptor(UserQuery, { id: '4', size: 32 });
            const id = operation.request.identifier;
            const storeData = {
                [id]: {
                    selector: operation.root,
                    retainTime: Date.now(),
                    dispose: false,
                    ttl: 10000,
                },
            };
            source = getRecordSourceImplementation(data);
            store = new RelayModernStore(
                source,
                {
                    storage: createPersistedStore(storeData),
                    mergeState: (restoredState, _initialState): any => {
                        return Object.keys(restoredState).reduce((acc, key) => {
                            const previous = acc[key];
                            if (previous.selector) {
                                acc[key] = {
                                    ...previous,
                                    operation: {
                                        root: previous.selector,
                                    },
                                    dispose: true,
                                    refCount: 0,
                                    fetchTime: previous.retainTime,
                                    ttl: 1,
                                };
                            }

                            return acc;
                        }, restoredState);
                    },
                },
                { queryCacheExpirationTime: -1 },
            );
        });

        it('prevents data from being collected', () => {
            const { dispose } = store.retain(createOperationDescriptor(UserQuery, { id: 'fake', size: 32 }));
            dispose();
            jest.runOnlyPendingTimers();
            expect(source.toJSON()).toEqual(initialData);
        });

        it('dispose old persisted query', async () => {
            await store.hydrate();
            const { dispose } = store.retain(createOperationDescriptor(UserQuery, { id: 'fake', size: 32 }));
            dispose();
            await flushPromises();
            expect(source.toJSON()).toEqual({});
        });
    });

    describe('persisted retain()', () => {
        let data;
        let initialData;
        let source;
        let store;

        beforeEach(async () => {
            data = {
                '4': {
                    __id: '4',
                    id: '4',
                    __typename: 'User',
                    name: 'Zuck',
                    'profilePicture(size:32)': { [REF_KEY]: 'client:1' },
                },
                'client:1': {
                    __id: 'client:1',
                    uri: 'https://photo1.jpg',
                },
                'client:root': {
                    __id: 'client:root',
                    __typename: '__Root',
                    'node(id:"4")': { __ref: '4' },
                },
            };
            initialData = simpleClone(data);

            const operation = createOperationDescriptor(UserQuery, { id: '4', size: 32 });
            const id = operation.request.identifier;
            const storeData = {
                [id]: {
                    operation: operation,
                    retainTime: Date.now(),
                    dispose: true,
                    ttl: 10000,
                    refCount: 0,
                    epoch: null,
                },
            };
            source = getRecordSourceImplementation(data);
            store = new RelayModernStore(source, { storage: createPersistedStore(storeData) }, { queryCacheExpirationTime: -1 });
            await store.hydrate();
        });

        it('prevents data from being collected', () => {
            const { dispose } = store.retain(createOperationDescriptor(UserQuery, { id: 'fake', size: 32 }));
            dispose();
            jest.runOnlyPendingTimers();
            expect(source.toJSON()).toEqual(initialData);
        });
    });
});
