import { Store as RelayModernStore, RecordSource as WoraRecordSource } from '../src';

import { createOperationDescriptor, REF_KEY, ROOT_ID, ROOT_TYPE } from 'relay-runtime';
const { generateAndCompile, simpleClone } = require('relay-test-utils-internal');

jest.useFakeTimers();

function createPersistedStorage(clientState = {}) {
    const state = {};
    Object.keys(clientState).forEach((key) => (state['relay-records.' + key] = JSON.stringify(clientState[key])));
    return {
        getAllKeys: () => Promise.resolve(Object.keys(state)),
        setItem: (key, value) => Promise.resolve(undefined),
        removeItem: (key) => Promise.resolve(delete state[key]),
        getItem: (key) => Promise.resolve(state[key]),
        getState: () => state,
    } as any;
}

function mockDispose(dispose) {
    const realDate = Date.now;
    const date = Date.now();
    Date.now = jest.fn(() => date + 200);
    dispose();
    Date.now = realDate;
}

const getRecordSourceImplementation = (data) =>
    new WoraRecordSource({ storage: createPersistedStorage({ ...data }), initialState: { ...data } });
const ImplementationName = 'Wora Persist';
describe(`Relay Store with ${ImplementationName} Record Source`, () => {
    describe('retain()', () => {
        let UserQuery;
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
            source = getRecordSourceImplementation(data);
            store = new RelayModernStore(source, { storage: createPersistedStorage(), defaultTTL: 100 });
            await store.hydrate();
            ({ UserQuery } = generateAndCompile(`
            query UserQuery($id: ID!, $size: [Int]) {
              node(id: $id) {
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
            store.retain(createOperationDescriptor(UserQuery, { id: '4', size: 32 }));
            jest.runAllTimers();
            expect(source.toJSON()).toEqual(initialData);
        });

        it('prevents data when disposed before TTL', () => {
            const { dispose } = store.retain(createOperationDescriptor(UserQuery, { id: '4', size: 32 }));
            dispose();
            expect(data).toEqual(initialData);
            jest.runAllTimers();
            expect(source.toJSON()).toEqual(initialData);
        });

        it('frees data when disposed after TTL', () => {
            const { dispose } = store.retain(createOperationDescriptor(UserQuery, { id: '4', size: 32 }));
            mockDispose(dispose);
            expect(data).toEqual(initialData);
            jest.runAllTimers();
            expect(source.toJSON()).toEqual({});
        });

        it('fetchTime - prevents data when disposed before TTL', () => {
            const operation = createOperationDescriptor(UserQuery, { id: '4', size: 32 });
            let fetchTime = Date.now();
            jest.spyOn(global.Date, 'now').mockImplementation(() => fetchTime);
            const { dispose } = store.retain(operation);
            fetchTime += 200;
            store.notify(operation);
            dispose();
            expect(data).toEqual(initialData);
            jest.runAllTimers();
            expect(source.toJSON()).toEqual(initialData);
        });

        it('fetchTime - frees data when disposed after TTL', () => {
            const operation = createOperationDescriptor(UserQuery, { id: '4', size: 32 });
            let fetchTime = Date.now();
            jest.spyOn(global.Date, 'now').mockImplementation(() => fetchTime);
            const { dispose } = store.retain(operation);
            store.notify(operation);
            fetchTime += 200;
            dispose();
            expect(data).toEqual(initialData);
            jest.runAllTimers();
            expect(source.toJSON()).toEqual({});
        });

        it('only collects unreferenced data after TTL', () => {
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
                    'node(id:"842472")': { [REF_KEY]: '842472' },
                    'node(id:"4")': { [REF_KEY]: '4' },
                },
            });

            store.publish(nextSource);
            const { dispose } = store.retain(createOperationDescriptor(UserQuery, { id: '4', size: 32 }));
            store.retain(createOperationDescriptor(JoeQuery, { id: '842472' }));
            mockDispose(dispose); // release one of the holds but not the other
            jest.runAllTimers();
            expect(source.toJSON()).toEqual(nextSource.toJSON());
        });
    });
});
