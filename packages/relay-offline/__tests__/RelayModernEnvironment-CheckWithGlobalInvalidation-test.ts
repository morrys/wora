/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 * @emails oncall+relay
 */

// flowlint ambiguous-object-type:error

'use strict';

import { Store as RelayModernStore, RecordSource, Environment as RelayModernEnvironment } from '../src';
import { Network as RelayNetwork, Observable as RelayObservable, createOperationDescriptor } from 'relay-runtime';
import { createPersistedStorage } from '../src-test';
import { graphql } from 'relay-runtime';
const RelayRecordSource = {
    create: (data?: any) => new RecordSource({ storage: createPersistedStorage(), initialState: { ...data } }),
};
jest.useFakeTimers();

describe('check() with global invalidation', () => {
    let environment;
    let operation;
    let ParentQuery;
    let source;
    let store;
    let complete;
    let error;
    let next;
    let callbacks;
    let dataSource;
    let fetch;

    beforeEach(async () => {
        jest.resetModules();
        ParentQuery = graphql`
            query RelayModernEnvironmentCheckWithGlobalInvalidationTestParentQuery($size: [Int]!) {
                me {
                    id
                    name
                    profilePicture(size: $size) {
                        uri
                    }
                }
            }
        `;
        operation = createOperationDescriptor(ParentQuery, { size: 32 });

        complete = jest.fn();
        error = jest.fn();
        next = jest.fn();
        callbacks = { complete, error, next };
        fetch = (_query, _variables, _cacheConfig) => {
            return RelayObservable.create((sink) => {
                dataSource = sink;
            });
        };
        source = RelayRecordSource.create();
        store = new RelayModernStore(source, {}, { queryCacheExpirationTime: null });
        environment = new RelayModernEnvironment({
            network: RelayNetwork.create(fetch),
            store,
        });
        await environment.hydrate();
        store.purge();
    });

    describe('when store is invalidated before query has ever been written to the store', () => {
        it('returns available after receiving query from the server', () => {
            environment.commitUpdate((storeProxy) => {
                storeProxy.invalidateStore();
            });

            environment.retain(operation);
            environment.execute({ operation }).subscribe(callbacks);
            const payload = {
                data: {
                    me: {
                        __typename: 'User',
                        id: '4',
                        name: 'Zuck',
                        profilePicture: {
                            uri: 'https://...',
                        },
                    },
                },
            };
            const fetchTime = Date.now();
            jest.spyOn(global.Date, 'now').mockImplementation(() => fetchTime);
            dataSource.next(payload);
            dataSource.complete();
            jest.runOnlyPendingTimers();

            expect(environment.check(operation)).toEqual({
                status: 'available',
                fetchTime,
            });
        });

        it('returns missing if some data is missing after receiving query from the server', () => {
            environment.commitUpdate((storeProxy) => {
                storeProxy.invalidateStore();
            });

            environment.retain(operation);
            environment.execute({ operation }).subscribe(callbacks);
            const payload = {
                data: {
                    me: {
                        __typename: 'User',
                        id: '4',
                        name: 'Zuck',
                        profilePicture: {
                            uri: undefined,
                        },
                    },
                },
            };
            dataSource.next(payload);
            dataSource.complete();
            jest.runOnlyPendingTimers();

            expect(environment.check(operation)).toEqual({ status: 'missing' });
        });
    });

    describe('when store is invalidated after query has been written to the store', () => {
        it('returns stale even if full query is cached', () => {
            environment.retain(operation);
            environment.execute({ operation }).subscribe(callbacks);
            const payload = {
                data: {
                    me: {
                        __typename: 'User',
                        id: '4',
                        name: 'Zuck',
                        profilePicture: {
                            uri: 'https://...',
                        },
                    },
                },
            };
            dataSource.next(payload);
            dataSource.complete();
            jest.runOnlyPendingTimers();

            environment.commitUpdate((storeProxy) => {
                storeProxy.invalidateStore();
            });

            // Should return stale even if all data is cached since
            // store was invalidated after query completed
            expect(environment.check(operation)).toEqual({ status: 'stale' });
        });

        it('returns stale if some data is missing', () => {
            environment.retain(operation);
            environment.execute({ operation }).subscribe(callbacks);
            const payload = {
                data: {
                    me: {
                        __typename: 'User',
                        id: '4',
                        name: 'Zuck',
                        profilePicture: {
                            uri: undefined,
                        },
                    },
                },
            };
            dataSource.next(payload);
            dataSource.complete();
            jest.runOnlyPendingTimers();

            environment.commitUpdate((storeProxy) => {
                storeProxy.invalidateStore();
            });

            expect(environment.check(operation)).toEqual({ status: 'stale' });
        });
    });

    describe('when query is refetched after store is invalidated', () => {
        it('returns available if data is available after refetch', () => {
            environment.retain(operation);
            environment.execute({ operation }).subscribe(callbacks);
            let payload = {
                data: {
                    me: {
                        __typename: 'User',
                        id: '4',
                        name: 'Zuck',
                        profilePicture: {
                            uri: 'https://...',
                        },
                    },
                },
            };
            dataSource.next(payload);
            dataSource.complete();
            jest.runOnlyPendingTimers();

            environment.commitUpdate((storeProxy) => {
                storeProxy.invalidateStore();
            });

            // Expect data to not be available after invalidation
            expect(environment.check(operation)).toEqual({ status: 'stale' });

            environment.execute({ operation }).subscribe(callbacks);
            payload = {
                data: {
                    me: {
                        __typename: 'User',
                        id: '4',
                        name: 'Zuck',
                        profilePicture: {
                            uri: 'https://...',
                        },
                    },
                },
            };
            const fetchTime = Date.now();
            jest.spyOn(global.Date, 'now').mockImplementation(() => fetchTime);
            dataSource.next(payload);
            dataSource.complete();
            jest.runOnlyPendingTimers();

            // Expect data be available after refetch
            expect(environment.check(operation)).toEqual({
                status: 'available',
                fetchTime,
            });
        });

        it('returns missing if data is not available after refetch', () => {
            environment.retain(operation);
            environment.execute({ operation }).subscribe(callbacks);
            let payload = {
                data: {
                    me: {
                        __typename: 'User',
                        id: '4',
                        name: 'Zuck',
                        profilePicture: {
                            uri: undefined,
                        },
                    },
                },
            };
            dataSource.next(payload);
            dataSource.complete();
            jest.runOnlyPendingTimers();

            environment.commitUpdate((storeProxy) => {
                storeProxy.invalidateStore();
            });

            // Expect data to not be available after invalidation
            expect(environment.check(operation)).toEqual({ status: 'stale' });

            environment.execute({ operation }).subscribe(callbacks);
            payload = {
                data: {
                    me: {
                        __typename: 'User',
                        id: '4',
                        name: 'Zuck',
                        profilePicture: {
                            uri: undefined,
                        },
                    },
                },
            };
            dataSource.next(payload);
            dataSource.complete();
            jest.runOnlyPendingTimers();

            expect(environment.check(operation)).toEqual({ status: 'missing' });
        });
    });

    describe('when query has incremental payloads', () => {
        beforeEach(() => {
            const frag = graphql`
                fragment RelayModernEnvironmentCheckWithGlobalInvalidationTestFragment on User {
                    profilePicture(size: $size) {
                        uri
                    }
                }
            `;
            ParentQuery = graphql`
                query RelayModernEnvironmentCheckWithGlobalInvalidationTestParent2Query($size: [Int]!) {
                    me {
                        id
                        name
                        ...RelayModernEnvironmentCheckWithGlobalInvalidationTestFragment @defer(label: "UserFragment")
                    }
                }
            `;
            operation = createOperationDescriptor(ParentQuery, { size: 32 });
        });

        describe('when store is invalidated before query has been written to the store', () => {
            it('returns available after receiving payloads from the server', () => {
                environment.commitUpdate((storeProxy) => {
                    storeProxy.invalidateStore();
                });

                environment.retain(operation);
                environment.execute({ operation }).subscribe(callbacks);
                const payload = {
                    data: {
                        me: {
                            __typename: 'User',
                            id: '4',
                            name: 'Zuck',
                        },
                    },
                };
                dataSource.next(payload);
                jest.runOnlyPendingTimers();
                next.mockClear();

                // Still missing incremental payload
                expect(environment.check(operation)).toEqual({ status: 'missing' });

                const fetchTime = Date.now();
                jest.spyOn(global.Date, 'now').mockImplementation(() => fetchTime);
                dataSource.next({
                    data: {
                        id: '1',
                        __typename: 'User',
                        profilePicture: {
                            uri: 'https://...',
                        },
                    },
                    label: 'RelayModernEnvironmentCheckWithGlobalInvalidationTestParent2Query$defer$UserFragment',
                    path: ['me'],
                });
                dataSource.complete();
                jest.runOnlyPendingTimers();

                // Data for whole query should be available now
                expect(environment.check(operation)).toEqual({
                    status: 'available',
                    fetchTime,
                });
            });

            it('returns missing after receiving payloads from the server if data is still missing', () => {
                environment.commitUpdate((storeProxy) => {
                    storeProxy.invalidateStore();
                });

                environment.retain(operation);
                environment.execute({ operation }).subscribe(callbacks);
                const payload = {
                    data: {
                        me: {
                            __typename: 'User',
                            id: '4',
                            name: 'Zuck',
                        },
                    },
                };
                dataSource.next(payload);
                jest.runOnlyPendingTimers();
                next.mockClear();

                // Still missing incremental payload
                expect(environment.check(operation)).toEqual({ status: 'missing' });

                dataSource.next({
                    data: {
                        id: '1',
                        __typename: 'User',
                        profilePicture: {
                            uri: undefined,
                        },
                    },
                    label: 'ParentQuery$defer$UserFragment',
                    path: ['me'],
                });
                dataSource.complete();
                jest.runOnlyPendingTimers();

                // Data is still missing
                expect(environment.check(operation)).toEqual({ status: 'missing' });
            });
        });

        describe('when store is invalidated in between incremental payloads', () => {
            it('returns stale after receiving payloads from the server', () => {
                environment.retain(operation);
                environment.execute({ operation }).subscribe(callbacks);
                const payload = {
                    data: {
                        me: {
                            __typename: 'User',
                            id: '4',
                            name: 'Zuck',
                        },
                    },
                };
                dataSource.next(payload);
                jest.runOnlyPendingTimers();
                next.mockClear();

                // Still missing incremental payload
                expect(environment.check(operation)).toEqual({ status: 'missing' });

                // Invalidate the store in between incremental payloads
                environment.commitUpdate((storeProxy) => {
                    storeProxy.invalidateStore();
                });

                dataSource.next({
                    data: {
                        id: '1',
                        __typename: 'User',
                        profilePicture: {
                            uri: 'https://...',
                        },
                    },
                    label: 'ParentQuery$defer$UserFragment',
                    path: ['me'],
                });
                dataSource.complete();
                jest.runOnlyPendingTimers();

                // Should return false even if all data is cached since
                // store was invalidated after first payload was written
                expect(environment.check(operation)).toEqual({ status: 'stale' });
            });

            it('returns stale after receiving payloads from the server and data is still missing', () => {
                environment.retain(operation);
                environment.execute({ operation }).subscribe(callbacks);
                const payload = {
                    data: {
                        me: {
                            __typename: 'User',
                            id: '4',
                            name: 'Zuck',
                        },
                    },
                };
                dataSource.next(payload);
                jest.runOnlyPendingTimers();
                next.mockClear();

                // Still missing incremental payload
                expect(environment.check(operation)).toEqual({ status: 'missing' });

                // Invalidate the store in between incremental payloads
                environment.commitUpdate((storeProxy) => {
                    storeProxy.invalidateStore();
                });

                dataSource.next({
                    data: {
                        id: '1',
                        __typename: 'User',
                        profilePicture: {
                            uri: undefined,
                        },
                    },
                    label: 'ParentQuery$defer$UserFragment',
                    path: ['me'],
                });
                dataSource.complete();
                jest.runOnlyPendingTimers();

                expect(environment.check(operation)).toEqual({ status: 'stale' });
            });
        });

        describe('when store is invalidated after all incremental payloads have been written to the store', () => {
            it('returns stale after receiving payloads from the server', () => {
                environment.retain(operation);
                environment.execute({ operation }).subscribe(callbacks);
                const payload = {
                    data: {
                        me: {
                            __typename: 'User',
                            id: '4',
                            name: 'Zuck',
                        },
                    },
                };
                dataSource.next(payload);
                jest.runOnlyPendingTimers();
                next.mockClear();

                // Still missing incremental payload
                expect(environment.check(operation)).toEqual({ status: 'missing' });

                dataSource.next({
                    data: {
                        id: '1',
                        __typename: 'User',
                        profilePicture: {
                            uri: 'https://...',
                        },
                    },
                    label: 'ParentQuery$defer$UserFragment',
                    path: ['me'],
                });
                dataSource.complete();
                jest.runOnlyPendingTimers();

                // Invalidate the store after query has completed
                environment.commitUpdate((storeProxy) => {
                    storeProxy.invalidateStore();
                });

                // Should return stale even if all data is cached since
                // store was invalidated after query completed
                expect(environment.check(operation)).toEqual({ status: 'stale' });
            });

            it('returns stale after receiving payloads from the server and data is still missing', () => {
                environment.retain(operation);
                environment.execute({ operation }).subscribe(callbacks);
                const payload = {
                    data: {
                        me: {
                            __typename: 'User',
                            id: '4',
                            name: 'Zuck',
                        },
                    },
                };
                dataSource.next(payload);
                jest.runOnlyPendingTimers();
                next.mockClear();

                // Still missing incremental payload
                expect(environment.check(operation)).toEqual({ status: 'missing' });

                dataSource.next({
                    data: {
                        id: '1',
                        __typename: 'User',
                        profilePicture: {
                            uri: undefined,
                        },
                    },
                    label: 'ParentQuery$defer$UserFragment',
                    path: ['me'],
                });
                dataSource.complete();
                jest.runOnlyPendingTimers();

                // Invalidate the store after query has completed
                environment.commitUpdate((storeProxy) => {
                    storeProxy.invalidateStore();
                });

                expect(environment.check(operation)).toEqual({ status: 'stale' });
            });
        });
    });
});
