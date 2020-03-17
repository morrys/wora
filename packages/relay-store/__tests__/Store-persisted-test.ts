import * as RelayModernRecord from 'relay-runtime/lib/store/RelayModernRecord';
import { Store as RelayModernStore, RecordSource as WoraRecordSource } from '../src';
import RelayRecordSourceObjectImpl from 'relay-runtime/lib/store/RelayRecordSourceMapImpl';

import { getRequest } from 'relay-runtime/lib/query/GraphQLTag';
import { createOperationDescriptor, createReaderSelector, createNormalizationSelector, REF_KEY, ROOT_ID, ROOT_TYPE } from 'relay-runtime';
const { generateAndCompile, simpleClone } = require('relay-test-utils-internal');
jest.useFakeTimers();
jest.mock('relay-runtime/lib/util/resolveImmediate', () => require.requireActual('../__mocks__/resolveImmediate').default);

function assertIsDeeplyFrozen(value: {} | ReadonlyArray<{}>) {
    if (!value) {
        throw new Error('Expected value to be a non-null object or array of objects');
    }
    expect(Object.isFrozen(value)).toBe(true);
    if (Array.isArray(value)) {
        value.forEach((item) => assertIsDeeplyFrozen(item));
    } else if (typeof value === 'object' && value !== null) {
        for (const key in value) {
            assertIsDeeplyFrozen(value[key]);
        }
    }
}

function createPersistedStorage(clientState = {}) {
    const state = {};
    Object.keys(clientState).forEach((key) => (state['relay-records.' + key] = JSON.stringify(clientState[key])));
    return {
        getAllKeys: () => Promise.resolve(Object.keys(state)),
        setItem: (key, value) => Promise.resolve((state[key] = value)),
        removeItem: (key) => Promise.resolve(delete state[key]),
        getItem: (key) => Promise.resolve(state[key]),
        getState: () => state,
    } as any;
}

const getRecordSourceImplementation = (data) => new WoraRecordSource({ storage: createPersistedStorage({...data}), initialState: {...data} });
const ImplementationName = 'Wora Persist';
describe(`Relay Store with ${ImplementationName} Record Source`, () => {
    describe('retain()', () => {
        let UserQuery;
        let UserFragment;
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
                  'profilePicture(size:32)': {[REF_KEY]: 'client:1'},
                },
                'client:1': {
                  __id: 'client:1',
                  uri: 'https://photo1.jpg',
                },
                'client:root': {
                  __id: 'client:root',
                  __typename: '__Root',
                  'node(id:"4")': {__ref: '4'},
                },
              };
            initialData = simpleClone(data);
            source = getRecordSourceImplementation(data);
            store = new RelayModernStore(source, { prefix: 't1', defaultTTL: -1 });
            await store.hydrate();
            await store._cache.purge();
            ({ UserFragment, UserQuery } = generateAndCompile(`
          query UserQuery($size: Int) {
            me {
              ...UserFragment
            }
          }

          fragment UserFragment on User {
            name
            profilePicture(size: $size) {
              uri
            }
          }
        `));
        });

        it('prevents data from being collected', () => {
            store.retain(createOperationDescriptor(UserQuery, {id: '4', size: 32}));
            jest.runOnlyPendingTimers();
            expect(source.toJSON()).toEqual(initialData);
        });

        it('frees data when disposed', () => {
            const {dispose} = store.retain(
                createOperationDescriptor(UserQuery, {id: '4', size: 32}),
              );
            dispose();
            expect(data).toEqual(initialData);
            jest.runOnlyPendingTimers();
            expect(source.toJSON()).toEqual({});
        });

        it('only collects unreferenced data', () => {
            const { JoeQuery } = generateAndCompile(`
            fragment JoeFragment on Query @argumentDefinitions(
                id: {type: "ID"}
            ) {
                node(id: $id) {
                ... on User {
                    name
                }
                }
            }
            query JoeQuery($id: ID!) {
                ...JoeFragment @arguments(id: $id)
            }
            `);
            const nextSource = getRecordSourceImplementation({
                '842472': {
                __id: '842472',
                __typename: 'User',
                name: 'Joe',
                },
                [ROOT_ID]: {
                __id: ROOT_ID,
                __typename: ROOT_TYPE,
                'node(id:"842472")': {[REF_KEY]: '842472'},
                'node(id:"4")': {[REF_KEY]: '4'},
                },
            });
            store.publish(nextSource);
            const {dispose} = store.retain(
                createOperationDescriptor(UserQuery, {id: '4', size: 32}),
              );
              store.retain(createOperationDescriptor(JoeQuery, {id: '842472'}));

            dispose(); // release one of the holds but not the other
            jest.runOnlyPendingTimers();
            expect(source.toJSON()).toEqual(nextSource.toJSON());
        });
    });

    describe('lookup()', () => {
        let UserQuery;
        let UserFragment;
        let data;
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
            };
            source = getRecordSourceImplementation(data);
            store = new RelayModernStore(source, { prefix: 't2', defaultTTL: -1 });
            await store.hydrate();
            await store._cache.purge();
            ({ UserFragment, UserQuery } = generateAndCompile(`
          fragment UserFragment on User {
            name
            profilePicture(size: $size) {
              uri
            }
          }

          query UserQuery($size: Int) {
            me {
              ...UserFragment
            }
          }
        `));
        });

        it('returns selector data', () => {
            const owner = createOperationDescriptor(UserQuery, {});
            const selector = createReaderSelector(UserFragment, '4', { size: 32 }, owner.request);
            const snapshot = store.lookup(selector);
            expect(snapshot).toEqual({
                selector,
                data: {
                    name: 'Zuck',
                    profilePicture: {
                        uri: 'https://photo1.jpg',
                    },
                },
                seenRecords: {
                    ...data,
                },
                isMissingData: false,
            });
            for (const id in snapshot.seenRecords) {
                if (snapshot.seenRecords.hasOwnProperty(id)) {
                    const record = snapshot.seenRecords[id];
                    expect(record).toStrictEqual(data[id]);
                }
            }
        });

        it('includes fragment owner in selector data when owner is provided', () => {
            ({ UserQuery, UserFragment } = generateAndCompile(`
          query UserQuery($size: Float!) {
            me {
              ...UserFragment
            }
          }

          fragment UserFragment on User {
            name
            profilePicture(size: $size) {
              uri
            }
            ...ChildUserFragment
          }

          fragment ChildUserFragment on User {
            username
          }
        `));
            const queryNode = getRequest(UserQuery);
            const owner = createOperationDescriptor(queryNode, { size: 32 });
            const selector = createReaderSelector(UserFragment, '4', { size: 32 }, owner.request);
            const snapshot = store.lookup(selector);
            expect(snapshot).toEqual({
                selector,
                data: {
                    name: 'Zuck',

                    profilePicture: {
                        uri: 'https://photo1.jpg',
                    },

                    __id: '4',
                    __fragments: { ChildUserFragment: {} },
                    __fragmentOwner: owner.request,
                },
                seenRecords: {
                    ...data,
                },
                isMissingData: false,
            });
            expect(snapshot.data.__fragmentOwner).toBe(owner.request); // expect(snapshot.data?.__fragmentOwner).toBe(owner.request);
            for (const id in snapshot.seenRecords) {
                if (snapshot.seenRecords.hasOwnProperty(id)) {
                    const record = snapshot.seenRecords[id];
                    expect(record).toStrictEqual(data[id]);
                }
            }
        });

        it('returns deeply-frozen objects', () => {
            const owner = createOperationDescriptor(UserQuery, {});
            const selector = createReaderSelector(UserFragment, '4', { size: 32 }, owner.request);
            const snapshot = store.lookup(selector);
            expect(Object.isFrozen(snapshot)).toBe(true);
            assertIsDeeplyFrozen(snapshot.data);
            assertIsDeeplyFrozen(snapshot.selector.variables);
        });

        it('returns updated data after a publish', () => {
            const nextData = {
                '4': {
                    __id: '4',
                    __typename: 'User',
                    'profilePicture(size:32)': { [REF_KEY]: 'client:2' },
                },
                'client:2': {
                    __id: 'client:2',
                    __typename: 'Image',
                    uri: 'https://photo1.jpg',
                },
            };
            const nextSource = new RelayRecordSourceObjectImpl(nextData);
            store.publish(nextSource); // takes effect w/o calling notify()

            const owner = createOperationDescriptor(UserQuery, { size: 32 });
            const selector = createReaderSelector(UserFragment, '4', { size: 32 }, owner.request);
            const snapshot = store.lookup(selector);
            expect(snapshot).toEqual({
                selector,
                data: {
                    name: 'Zuck',
                    profilePicture: {
                        uri: 'https://photo1.jpg',
                    },
                },
                seenRecords: {
                    '4': { ...data['4'], ...nextData['4'] },
                    'client:2': nextData['client:2'],
                },
                isMissingData: false,
            });
        });
    });

    describe('notify/publish/subscribe', () => {
        let UserQuery;
        let UserFragment;
        let data;
        let source;
        let store;

        beforeEach(async () => {
            data = {
                '4': {
                  __id: '4',
                  id: '4',
                  __typename: 'User',
                  name: 'Zuck',
                  'profilePicture(size:32)': {[REF_KEY]: 'client:1'},
                  emailAddresses: ['a@b.com'],
                },
                'client:1': {
                  __id: 'client:1',
                  uri: 'https://photo1.jpg',
                },
                'client:root': {
                  __id: 'client:root',
                  __typename: '__Root',
                  'node(id:"4")': {__ref: '4'},
                  me: {__ref: '4'},
                },
              };
            source = getRecordSourceImplementation(data);
            store = new RelayModernStore(source, { prefix: 't3', defaultTTL: -1 });
            await store.hydrate();
            await store._cache.purge();
            ({ UserFragment, UserQuery } = generateAndCompile(`
          fragment UserFragment on User {
            name
            profilePicture(size: $size) {
              uri
            }
            emailAddresses
          }

          query UserQuery($size: Int) {
            me {
              ...UserFragment
            }
          }
        `));
        });

        it('calls subscribers whose data has changed since previous notify', () => {
            // subscribe(), publish(), notify() -> subscriber called
            const owner = createOperationDescriptor(UserQuery, {});
            const selector = createReaderSelector(UserFragment, '4', { size: 32 }, owner.request);
            const snapshot = store.lookup(selector);
            const callback = jest.fn();
            store.subscribe(snapshot, callback);
            // Publish a change to profilePicture.uri
            // wora: nextSource use a relay record source
            const nextSource = new RelayRecordSourceObjectImpl({
                'client:1': {
                    __id: 'client:1',
                    uri: 'https://photo2.jpg',
                },
            });
            store.publish(nextSource);
            expect(callback).not.toBeCalled();
            store.notify();
            expect(callback.mock.calls.length).toBe(1);
            expect(callback.mock.calls[0][0]).toEqual({
                ...snapshot,
                data: {
                    name: 'Zuck',
                    profilePicture: {
                        uri: 'https://photo2.jpg', // new uri
                    },
                    emailAddresses: ['a@b.com'],
                },
                seenRecords: {
                    '4': {
                      __id: '4',
                      id: '4',
                      __typename: 'User',
                      name: 'Zuck',
                      'profilePicture(size:32)': {[REF_KEY]: 'client:1'},
                      emailAddresses: ['a@b.com'],
                    },
                    'client:1': {
                      ...data['client:1'],
                      uri: 'https://photo2.jpg',
                    },
                  },
            });
        });

        it('calls subscribers and reads data with fragment owner if one is available in subscription snapshot', () => {
            // subscribe(), publish(), notify() -> subscriber called
            ({ UserQuery, UserFragment } = generateAndCompile(`
          query UserQuery($size: Float!) {
            me {
              ...UserFragment
            }
          }

          fragment UserFragment on User {
            name
            profilePicture(size: $size) {
              uri
            }
            emailAddresses
          }
        `));
            const queryNode = getRequest(UserQuery);
            const owner = createOperationDescriptor(queryNode, { size: 32 });
            const selector = createReaderSelector(UserFragment, '4', { size: 32 }, owner.request);
            const snapshot = store.lookup(selector);
            expect(snapshot.selector).toBe(selector);

            const callback = jest.fn();
            store.subscribe(snapshot, callback);
            // Publish a change to profilePicture.uri
            const nextSource = new RelayRecordSourceObjectImpl({
                'client:1': {
                    __id: 'client:1',
                    uri: 'https://photo2.jpg',
                },
            });
            store.publish(nextSource);
            expect(callback).not.toBeCalled();
            store.notify();
            expect(callback.mock.calls.length).toBe(1);
            expect(callback.mock.calls[0][0]).toEqual({
                ...snapshot,
                data: {
                    name: 'Zuck',
                    profilePicture: {
                        uri: 'https://photo2.jpg', // new uri
                    },
                    emailAddresses: ['a@b.com'],
                },
                seenRecords: {
                    '4': {
                      __id: '4',
                      id: '4',
                      __typename: 'User',
                      name: 'Zuck',
                      'profilePicture(size:32)': {[REF_KEY]: 'client:1'},
                      emailAddresses: ['a@b.com'],
                    },
                    'client:1': {
                      ...data['client:1'],
                      uri: 'https://photo2.jpg',
                    },
                  },
            });
            expect(callback.mock.calls[0][0].selector).toBe(selector);
        });

        it('vends deeply-frozen objects', () => {
            const owner = createOperationDescriptor(UserQuery, {});
            const selector = createReaderSelector(UserFragment, '4', { size: 32 }, owner.request);
            const snapshot = store.lookup(selector);
            const callback = jest.fn();
            store.subscribe(snapshot, callback);
            // Publish a change to profilePicture.uri
            const nextSource = new RelayRecordSourceObjectImpl({
                'client:1': {
                    __id: 'client:1',
                    uri: 'https://photo2.jpg',
                },
            });
            store.publish(nextSource);
            store.notify();
            expect(callback.mock.calls.length).toBe(1);
            const nextSnapshot = callback.mock.calls[0][0];
            expect(Object.isFrozen(nextSnapshot)).toBe(true);
            assertIsDeeplyFrozen(nextSnapshot.data);
            assertIsDeeplyFrozen(nextSnapshot.selector.variables);
        });

        it('calls affected subscribers only once', () => {
            // subscribe(), publish(), publish(), notify() -> subscriber called once
            const owner = createOperationDescriptor(UserQuery, {});
            const selector = createReaderSelector(UserFragment, '4', { size: 32 }, owner.request);
            const snapshot = store.lookup(selector);
            const callback = jest.fn();
            store.subscribe(snapshot, callback);
            // Publish a change to profilePicture.uri
            let nextSource = new RelayRecordSourceObjectImpl({
                '4': {
                    __id: '4',
                    __typename: 'User',
                    name: 'Mark',
                    emailAddresses: ['a@b.com', 'c@d.net'],
                },
                'client:1': {
                    __id: 'client:1',
                    uri: 'https://photo2.jpg',
                },
            });
            store.publish(nextSource);
            nextSource = new RelayRecordSourceObjectImpl({
                'client:1': {
                    __id: 'client:1',
                    uri: 'https://photo3.jpg',
                },
            });
            store.publish(nextSource);
            expect(callback).not.toBeCalled();
            store.notify();
            expect(callback.mock.calls.length).toBe(1);
            expect(callback.mock.calls[0][0]).toEqual({
                ...snapshot,
                data: {
                    name: 'Mark',
                    profilePicture: {
                        uri: 'https://photo3.jpg', // most recent uri
                    },
                    emailAddresses: ['a@b.com', 'c@d.net'],
                },
                seenRecords: {
                    '4': {
                        ...data['4'],
                        name: 'Mark',
                        emailAddresses: ['a@b.com', 'c@d.net'],
                    },
                    'client:1': {
                        ...data['client:1'],
                        uri: 'https://photo3.jpg',
                    },
                },
            });
        });

        it('notifies subscribers and sets updated value for isMissingData', async () => {
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
            };
            source = getRecordSourceImplementation(data);
            store = new RelayModernStore(source, { prefix: 't4', defaultTTL: -1 });
            await store.hydrate();
            await store._cache.purge();
            const owner = createOperationDescriptor(UserQuery, {});
            const selector = createReaderSelector(UserFragment, '4', { size: 32 }, owner.request);
            const snapshot = store.lookup(selector);
            expect(snapshot.isMissingData).toEqual(true);

            const callback = jest.fn();
            // Record does not exist when subscribed
            store.subscribe(snapshot, callback);
            const nextSource = new RelayRecordSourceObjectImpl({
                '4': {
                    __id: '4',
                    __typename: 'User',
                    emailAddresses: ['a@b.com'],
                },
            });
            store.publish(nextSource);
            store.notify();
            expect(callback.mock.calls.length).toBe(1);
            expect(callback.mock.calls[0][0]).toEqual({
                ...snapshot,
                isMissingData: false,
                data: {
                    name: 'Zuck',
                    profilePicture: {
                        uri: 'https://photo1.jpg',
                    },
                    emailAddresses: ['a@b.com'],
                },
                seenRecords: {
                    '4': {
                        ...data['4'],
                        emailAddresses: ['a@b.com'],
                    },
                    'client:1': {
                        ...data['client:1'],
                    },
                },
            });
        });

        it('notifies subscribers of changes to unfetched records', () => {
            const owner = createOperationDescriptor(UserQuery, {});
            const selector = createReaderSelector(
                UserFragment,
                '842472',
                {
                    size: 32,
                },
                owner.request,
            );
            const snapshot = store.lookup(selector);
            const callback = jest.fn();
            // Record does not exist when subscribed
            store.subscribe(snapshot, callback);
            const nextSource = new RelayRecordSourceObjectImpl({
                '842472': {
                    __id: '842472',
                    __typename: 'User',
                    name: 'Joe',
                },
            });
            store.publish(nextSource);
            store.notify();
            expect(callback.mock.calls.length).toBe(1);
            expect(callback.mock.calls[0][0]).toEqual({
                ...snapshot,
                data: {
                    name: 'Joe',
                    profilePicture: undefined,
                },
                isMissingData: true,
                seenRecords: nextSource.toJSON(),
            });
        });

        it('notifies subscribers of changes to deleted records', () => {
            const owner = createOperationDescriptor(UserQuery, {});
            const selector = createReaderSelector(
                UserFragment,
                '842472',
                {
                    size: 32,
                },
                owner.request,
            );
            // Initially delete the record
            source.delete('842472');
            const snapshot = store.lookup(selector);
            const callback = jest.fn();
            // Record does not exist when subscribed
            store.subscribe(snapshot, callback);
            // Create it again
            const nextSource = new RelayRecordSourceObjectImpl({
                '842472': {
                    __id: '842472',
                    __typename: 'User',
                    name: 'Joe',
                },
            });
            store.publish(nextSource);
            store.notify();
            expect(callback.mock.calls.length).toBe(1);
            expect(callback.mock.calls[0][0]).toEqual({
                ...snapshot,
                data: {
                    name: 'Joe',
                    profilePicture: undefined,
                },
                isMissingData: true,
                seenRecords: nextSource.toJSON(),
            });
        });

        it('does not call subscribers whose data has not changed', () => {
            // subscribe(), publish() -> subscriber *not* called
            const owner = createOperationDescriptor(UserQuery, {});
            const selector = createReaderSelector(UserFragment, '4', { size: 32 }, owner.request);
            const snapshot = store.lookup(selector);
            const callback = jest.fn();
            store.subscribe(snapshot, callback);
            // Publish a change to profilePicture.uri
            const nextSource = new RelayRecordSourceObjectImpl({
                '842472': {
                    __id: '842472',
                    __typename: 'User',
                    name: 'Joe',
                },
            });
            store.publish(nextSource);
            store.notify();
            expect(callback).not.toBeCalled();
        });

        it('does not notify disposed subscribers', () => {
            // subscribe(), publish(), dispose(), notify() -> subscriber *not* called
            const owner = createOperationDescriptor(UserQuery, {});
            const selector = createReaderSelector(UserFragment, '4', { size: 32 }, owner.request);
            const snapshot = store.lookup(selector);
            const callback = jest.fn();
            const { dispose } = store.subscribe(snapshot, callback);
            // Publish a change to profilePicture.uri
            const nextSource = new RelayRecordSourceObjectImpl({
                'client:1': {
                    __id: 'client:1',
                    uri: 'https://photo2.jpg',
                },
            });
            store.publish(nextSource);
            dispose();
            store.notify();
            expect(callback).not.toBeCalled();
        });

        /*
        WORA: in development mode, when the data is recovered from the store, the records are not freeze
        it('throws if source records are modified', () => {
            const zuck = source.get('4');
            expect(zuck).toBeTruthy();
            expect(() => {
                // $FlowFixMe
                RelayModernRecord.setValue(zuck, 'pet', 'Beast');
            }).toThrow(TypeError);
        });
        */

        it('throws if published records are modified', () => {
            // Create and publish a source with a new record
            const nextSource = new RelayRecordSourceObjectImpl({});
            const beast = RelayModernRecord.create('beast', 'Pet');
            nextSource.set('beast', beast);
            store.publish(nextSource);
            expect(() => {
                RelayModernRecord.setValue(beast, 'name', 'Beast');
            }).toThrow(TypeError);
        });

        it('throws if updated records are modified', () => {
            // Create and publish a source with a record of the same id
            const nextSource = new RelayRecordSourceObjectImpl({});
            const beast = RelayModernRecord.create('beast', 'Pet');
            nextSource.set('beast', beast);
            const zuck = RelayModernRecord.create('4', 'User');
            RelayModernRecord.setLinkedRecordID(zuck, 'pet', 'beast');
            nextSource.set('4', zuck);
            store.publish(nextSource);

            // Cannot modify merged record
            expect(() => {
                const mergedRecord = source.get('4');
                expect(mergedRecord).toBeTruthy();
                // $FlowFixMe
                RelayModernRecord.setValue(mergedRecord, 'pet', null);
            }).toThrow(TypeError);
            // Cannot modify the published record, even though it isn't in the store
            // This is for consistency because it is non-deterinistic if published
            // records will be merged into a new object or used as-is.
            expect(() => {
                RelayModernRecord.setValue(zuck, 'pet', null);
            }).toThrow(TypeError);
        });
    });

    describe('check()', () => {
        let UserQuery;
        let UserFragment;
        let data;
        let source;
        let store;

        beforeEach(async () => {
            data = {
                '4': {
                  __id: '4',
                  id: '4',
                  __typename: 'User',
                  name: 'Zuck',
                  'profilePicture(size:32)': {[REF_KEY]: 'client:1'},
                },
                'client:1': {
                  __id: 'client:1',
                  uri: 'https://photo1.jpg',
                },
                'client:root': {
                  __id: 'client:root',
                  __typename: '__Root',
                  'node(id:"4")': {__ref: '4'},
                },
              };
            source = getRecordSourceImplementation(data);
            store = new RelayModernStore(source, { prefix: 't5', defaultTTL: -1 });
            await store.hydrate();
            await store._cache.purge();
            ({ UserQuery } = generateAndCompile(`
            fragment UserFragment on User {
                name
                profilePicture(size: $size) {
                  uri
                }
              }
          query UserQuery($id: ID!, $size: [Int]) {
            node(id: $id) {
              ...UserFragment
            }
          }
        `));
        });

        it('returns available if all data exists in the cache', () => {
            const operation = createOperationDescriptor(UserQuery, {
                id: '4',
                size: 32,
            });
            expect(store.check(operation)).toEqual({
                status: 'available',
                fetchTime: null,
              });
        });

        it('returns missing if a scalar field is missing', () => {
            const operation = createOperationDescriptor(UserQuery, {
                id: '4',
                size: 32,
            });
            store.publish(
                new RelayRecordSourceObjectImpl({
                    'client:1': {
                        __id: 'client:1',
                        uri: undefined, // unpublish the field
                    },
                }),
            );
            expect(store.check(operation)).toEqual({status: 'missing'});
        });

        it('returns missing if a linked field is missing', () => {
            const operation = createOperationDescriptor(UserQuery, {
                id: '4',
                size: 64,
            });
            expect(store.check(operation)).toEqual({status: 'missing'});
        });

        it('returns missing if a linked record is missing', async () => {
            // $FlowFixMe found deploying v0.109.0
            delete data['client:1']; // profile picture
            source = getRecordSourceImplementation(data);
            store = new RelayModernStore(source, { prefix: 't6', defaultTTL: -1 });
            await store.hydrate();
            await store._cache.purge();
            const operation = createOperationDescriptor(UserQuery, {
                id: '4',
                size: 32,
            });
            expect(store.check(operation)).toEqual({status: 'missing'});
        });

        it('returns missing if the root record is missing', () => {
            const operation = createOperationDescriptor(UserQuery, {
                id: '842472',
                size: 32,
            });
            expect(store.check(operation)).toEqual({status: 'missing'});
        });
    });

    describe('GC Scheduler', () => {
        let UserQuery;
        let UserFragment;
        let data;
        let initialData;
        let source;
        let store;
        let callbacks;
        let scheduler;

        beforeEach(async () => {
            data = {
                '4': {
                  __id: '4',
                  id: '4',
                  __typename: 'User',
                  name: 'Zuck',
                  'profilePicture(size:32)': {[REF_KEY]: 'client:1'},
                },
                'client:1': {
                  __id: 'client:1',
                  uri: 'https://photo1.jpg',
                },
                'client:root': {
                  __id: 'client:root',
                  __typename: '__Root',
                  'node(id:"4")': {__ref: '4'},
                },
              };
            initialData = simpleClone(data);
            callbacks = [];
            scheduler = jest.fn(callbacks.push.bind(callbacks));
            source = getRecordSourceImplementation(data);
            store = new RelayModernStore(source, { prefix: 't7', defaultTTL: -1 }, { gcScheduler: scheduler });
            await store.hydrate();
            await store._cache.purge();
            ({ UserQuery, UserFragment } = generateAndCompile(`
                fragment UserFragment on User {
                    name
                    profilePicture(size: $size) {
                    uri
                    }
                }
                query UserQuery($id: ID!, $size: [Int]) {
                    node(id: $id) {
                    ...UserFragment
                    }
                }
                `));
        });

        it('calls the gc scheduler function when GC should run', () => {
            const {dispose} = store.retain(
                createOperationDescriptor(UserQuery, {id: '4', size: 32}),
              );
            expect(scheduler).not.toBeCalled();
            dispose();
            expect(scheduler).toBeCalled();
            expect(callbacks.length).toBe(1);
        });

        it('Runs GC when the GC scheduler executes the task', () => {
            const {dispose} = store.retain(
                createOperationDescriptor(UserQuery, {id: '4', size: 32}),
              );
            dispose();
            expect(source.toJSON()).toEqual(initialData);
            callbacks[0](); // run gc
            expect(source.toJSON()).toEqual({});
        });
    });

    describe('holdGC()', () => {
        let UserQuery;
        let UserFragment;
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
                  'profilePicture(size:32)': {[REF_KEY]: 'client:1'},
                },
                'client:1': {
                  __id: 'client:1',
                  uri: 'https://photo1.jpg',
                },
                'client:root': {
                  __id: 'client:root',
                  __typename: '__Root',
                  'node(id:"4")': {__ref: '4'},
                },
              };
            initialData = simpleClone(data);
            source = getRecordSourceImplementation(data);
            store = new RelayModernStore(source, { prefix: 't8', defaultTTL: -1 });
            await store.hydrate();
            await store._cache.purge();
            ({ UserQuery, UserFragment } = generateAndCompile(`
                    fragment UserFragment on User {
                        name
                        profilePicture(size: $size) {
                        uri
                        }
                    }
                    query UserQuery($id: ID!, $size: [Int]) {
                        node(id: $id) {
                        ...UserFragment
                        }
                    }
            `));

        it('prevents data from being collected with disabled GC, and reruns GC when it is enabled', () => {
            const gcHold = store.holdGC();
            const {dispose} = store.retain(
                createOperationDescriptor(UserQuery, {id: '4', size: 32}),
              );
            dispose();
            expect(data).toEqual(initialData);
            jest.runOnlyPendingTimers();
            expect(source.toJSON()).toEqual(initialData);
            gcHold.dispose();
            jest.runOnlyPendingTimers();
            expect(source.toJSON()).toEqual({});
        });
    });
});
