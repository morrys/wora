import { Store as RelayModernStore, RecordSource as WoraRecordSource } from '../src';

import { createNormalizationSelector, REF_KEY, ROOT_ID, ROOT_TYPE } from 'relay-runtime';
const { generateAndCompile, simpleClone } = require('relay-test-utils-internal');

jest.mock('relay-runtime/lib/util/resolveImmediate', () => require.requireActual('../__mocks__/resolveImmediate').default);

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

const getRecordSourceImplementation = (data) => new WoraRecordSource({ storage: createPersistedStorage(data) });
const ImplementationName = 'Wora Persist';
describe(`Relay Store with ${ImplementationName} Record Source`, () => {
    describe('retain()', () => {
        let UserFragment;
        let data;
        let initialData;
        let source;
        let store;

        beforeEach(async () => {
            jest.resetAllMocks();
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
            initialData = simpleClone(data);
            source = getRecordSourceImplementation(data);
            store = new RelayModernStore(source, { defaultTTL: 100 });
            await store.hydrate();
            ({ UserFragment } = generateAndCompile(`
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
            jest.useFakeTimers();
            store.retain(createNormalizationSelector(UserFragment, '4', { size: 32 }));
            jest.runOnlyPendingTimers();
            expect(source.toJSON()).toEqual(initialData);
        });

        it('prevents data when disposed before TTL', () => {
            jest.useFakeTimers();
            const { dispose } = store.retain(createNormalizationSelector(UserFragment, '4', { size: 32 }));
            dispose();
            expect(data).toEqual(initialData);
            jest.runOnlyPendingTimers();
            expect(source.toJSON()).toEqual(initialData);
        });

        it('frees data when disposed after TTL', async () => {
            jest.useRealTimers();
            const { dispose } = store.retain(createNormalizationSelector(UserFragment, '4', { size: 32 }));
            await sleep(100);
            jest.useFakeTimers();
            dispose();
            expect(data).toEqual(initialData);
            jest.runOnlyPendingTimers();
            expect(source.toJSON()).toEqual({});
        });

        it('only collects unreferenced data after TTL', async () => {
            const { JoeFragment } = generateAndCompile(`
          fragment JoeFragment on Query @argumentDefinitions(
            id: {type: "ID"}
          ) {
            node(id: $id) {
              ... on User {
                name
              }
            }
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
                },
            });
            store.publish(nextSource);
            const { dispose } = store.retain(createNormalizationSelector(UserFragment, '4', { size: 32 }));
            store.retain(createNormalizationSelector(JoeFragment, ROOT_ID, { id: '842472' }));
            jest.useRealTimers();
            await sleep(100);
            jest.useFakeTimers();
            dispose(); // release one of the holds but not the other
            jest.runOnlyPendingTimers();
            expect(source.toJSON()).toEqual(nextSource.toJSON());
        });
    });
});
