import { Store as RelayModernStore, RecordSource as WoraRecordSource } from '../src';

import { createOperationDescriptor, graphql, REF_KEY, ROOT_ID, ROOT_TYPE } from 'relay-runtime';
import { simpleClone } from 'relay-test-utils-internal';

import { createPersistedRecordSource, createPersistedStore } from '../src-test';

jest.useFakeTimers();

function mockDispose(dispose): void {
    const realDate = Date.now;
    const date = Date.now();
    Date.now = jest.fn(() => date + 200);
    dispose();
    Date.now = realDate;
}

const getRecordSourceImplementation = (data): any =>
    new WoraRecordSource({ storage: createPersistedRecordSource({ ...data }), initialState: { ...data } });
const ImplementationName = 'Wora Persist';
const StoreTimeToLiveTestUserFragment = graphql`
    fragment StoreTimeToLiveTestUserFragment on User {
        name
        profilePicture(size: $size) {
            uri
        }
    }
`;
const StoreTimeToLiveTestUserQuery: any = graphql`
    query StoreTimeToLiveTestUserQuery($id: ID!, $size: [Int]) {
        node(id: $id) {
            ...StoreTimeToLiveTestUserFragment
        }
    }
`;
describe(`Relay Store with ${ImplementationName} Record Source`, () => {
    describe('retain()', () => {
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
            store = new RelayModernStore(source, { storage: createPersistedStore() }, { queryCacheExpirationTime: 100 });
            await store.hydrate();
        });

        it('prevents data from being collected', () => {
            store.retain(createOperationDescriptor(StoreTimeToLiveTestUserQuery, { id: '4', size: 32 }));
            jest.runAllTimers();
            expect(source.toJSON()).toEqual(initialData);
        });

        it('prevents data when disposed before TTL', () => {
            const { dispose } = store.retain(createOperationDescriptor(StoreTimeToLiveTestUserQuery, { id: '4', size: 32 }));
            dispose();
            expect(data).toEqual(initialData);
            jest.runAllTimers();
            expect(source.toJSON()).toEqual(initialData);
        });

        it('frees data when disposed after TTL', () => {
            const { dispose } = store.retain(createOperationDescriptor(StoreTimeToLiveTestUserQuery, { id: '4', size: 32 }));
            mockDispose(dispose);
            expect(data).toEqual(initialData);
            jest.runAllTimers();
            expect(source.toJSON()).toEqual({});
        });

        it('fetchTime - prevents data when disposed before TTL', () => {
            const operation = createOperationDescriptor(StoreTimeToLiveTestUserQuery, { id: '4', size: 32 });
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
            const operation = createOperationDescriptor(StoreTimeToLiveTestUserQuery, { id: '4', size: 32 });
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
            const JoeFragment: any = graphql`
                fragment StoreTimeToLiveTestJoeFragment on Query @argumentDefinitions(id: { type: "ID" }) {
                    node(id: $id) {
                        ... on User {
                            name
                        }
                    }
                }
            `;
            const JoeQuery: any = graphql`
                query StoreTimeToLiveTestJoeQuery($id: ID!) {
                    ...StoreTimeToLiveTestJoeFragment @arguments(id: $id)
                }
            `;
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
            const { dispose } = store.retain(createOperationDescriptor(StoreTimeToLiveTestUserQuery, { id: '4', size: 32 }));
            store.retain(createOperationDescriptor(JoeQuery, { id: '842472' }));
            mockDispose(dispose); // release one of the holds but not the other
            jest.runAllTimers();
            expect(source.toJSON()).toEqual(nextSource.toJSON());
        });
    });
});
