import { Store as RelayModernStore, RecordSource, Environment as RelayModernEnvironment } from '../src';
import { Network as RelayNetwork, Observable as RelayObservable, createOperationDescriptor, createReaderSelector } from 'relay-runtime';
import { createPersistedStorage } from '../src-test';
import { graphql } from 'relay-runtime';
const RelayRecordSource = {
    create: (data?: any) => new RecordSource({ storage: createPersistedStorage(), initialState: { ...data } }),
};

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

describe(`Relay Offline`, () => {
    let callbacks;
    let commentID;
    let CommentFragment;
    let CommentQuery;
    let complete;
    let CreateCommentMutation;
    let CreateCommentWithSpreadMutation;
    let environment;
    let error;
    let fetch;
    let operation;
    let queryOperation;
    let source;
    let store;
    let subject;
    let variables;
    let queryVariables;

    beforeEach(() => {
        jest.resetModules();
        commentID = 'comment-id';
        CommentFragment = graphql`
            fragment RelayOfflineTestCommentFragment on Comment {
                id
                body {
                    text
                }
            }
        `;
        CreateCommentMutation = graphql`
            mutation RelayOfflineTestCreateCommentMutation($input: CommentCreateInput!) {
                commentCreate(input: $input) {
                    comment {
                        id
                        body {
                            text
                        }
                    }
                }
            }
        `;
        CreateCommentWithSpreadMutation = graphql`
            mutation RelayOfflineTestCreateCommentWithSpreadMutation($input: CommentCreateInput!) {
                commentCreate(input: $input) {
                    comment {
                        ...RelayOfflineTestCommentFragment
                    }
                }
            }
        `;

        CommentQuery = graphql`
            query RelayOfflineTestCommentQuery($id: ID!) {
                node(id: $id) {
                    id
                    ...RelayOfflineTestCommentFragment
                }
            }
        `;
        variables = {
            input: {
                clientMutationId: '0',
                feedbackId: '1',
            },
        };
        queryVariables = {
            id: commentID,
        };
        operation = createOperationDescriptor(CreateCommentMutation, variables);
        queryOperation = createOperationDescriptor(CommentQuery, queryVariables);

        fetch = jest.fn((_query, _variables, _cacheConfig) =>
            RelayObservable.create((sink) => {
                subject = sink;
            }),
        );
        source = RelayRecordSource.create();
        store = new RelayModernStore(source, { storage: createPersistedStorage() });
        environment = new RelayModernEnvironment(
            {
                network: RelayNetwork.create(fetch),
                store,
            },
            { storage: createPersistedStorage() },
        );
        complete = jest.fn();
        error = jest.fn();
        callbacks = { complete, error };
    });

    describe('hydrate', () => {
        it('online', () => {
            environment.hydrate();
            jest.runAllTimers();
            expect(environment.isOnline()).toBeTruthy();
        });
    });

    describe('offline options', () => {
        let onlineGetter;

        describe('offline-options start, finish, publish, onPublish', () => {
            let execute;
            let start;
            let finish;
            let onPublish;
            beforeEach(() => {
                start = jest.fn((_mutations) => Promise.resolve(_mutations));
                finish = jest.fn((_mutations, _error) => Promise.resolve(undefined));
                onPublish = jest.fn((offlineRecord) => Promise.resolve(offlineRecord));
            });

            it('start/finish called when online', () => {
                const offlineOptions = {
                    start,
                    execute,
                    finish,
                } as any;
                environment.setOfflineOptions(offlineOptions);

                expect(start).toHaveBeenCalledTimes(0);
                expect(finish).toHaveBeenCalledTimes(0);
                environment.hydrate();
                jest.runAllTimers();
                expect(start).toHaveBeenCalledTimes(1);
                expect(finish).toHaveBeenCalledTimes(1);
            });
            it('start/finish not called when offline', () => {
                const offlineOptions = {
                    start,
                    execute,
                    finish,
                } as any;
                environment.setOfflineOptions(offlineOptions);
                onlineGetter = jest.spyOn(window.navigator, 'onLine', 'get');
                onlineGetter.mockReturnValue(false);

                expect(start).toHaveBeenCalledTimes(0);
                expect(finish).toHaveBeenCalledTimes(0);
                environment.hydrate();
                jest.runAllTimers();
                expect(start).toHaveBeenCalledTimes(0);
                expect(finish).toHaveBeenCalledTimes(0);
            });
            it('publish', () => {
                const offlineOptions = {
                    start,
                    execute,
                    onPublish,
                } as any;
                environment.setOfflineOptions(offlineOptions);
                environment.hydrate();
                jest.runAllTimers();
                expect(onPublish).toHaveBeenCalledTimes(0);

                onlineGetter = jest.spyOn(window.navigator, 'onLine', 'get');
                onlineGetter.mockReturnValue(false);
                environment.executeMutation({ operation }).subscribe(callbacks);
                expect(complete).not.toBeCalled();
                expect(error).not.toBeCalled();
                jest.runAllTimers();
                /*const request = {
                                payload: '/api/vi/test',
                            };
                            await environment.publish({
                                request,
                            });*/
                expect(complete).toBeCalled();
                expect(error).not.toBeCalled();
                expect(onPublish).toHaveBeenCalledTimes(1);
                expect(environment.getStoreOffline().getListMutation().length).toEqual(1);
                expect(environment.getStoreOffline().getListMutation()[0].request.payload.operation).toEqual(operation);
            });
        });

        describe('offline-options onComplete, onExecute, onDiscard', () => {
            let onExecute;
            let onComplete;
            let onDiscard;
            let executeReject;
            let start;
            let onPublish;
            beforeEach(() => {
                start = jest.fn((_mutations) => Promise.resolve(_mutations));
                onExecute = jest.fn((mutation) => Promise.resolve(mutation));
                executeReject = jest.fn((_offlineRecord) => Promise.reject(_offlineRecord));
                onComplete = jest.fn((_options) => Promise.resolve(true));
                onDiscard = jest.fn((_options) => Promise.resolve(true));
                onPublish = jest.fn((offlineRecord) => Promise.resolve(offlineRecord));
            });

            it('onExecute onComplete', () => {
                const offlineOptions = {
                    start,
                    onExecute,
                    onComplete,
                    onPublish,
                } as any;
                environment.setOfflineOptions(offlineOptions);
                onlineGetter = jest.spyOn(window.navigator, 'onLine', 'get');
                onlineGetter.mockReturnValue(false);
                environment.hydrate();
                jest.runAllTimers();
                expect(environment.isOnline()).not.toBeTruthy();
                environment.executeMutation({ operation }).subscribe(callbacks);
                jest.runAllTimers();
                expect(onPublish).toHaveBeenCalledTimes(1);
                expect(environment.getStoreOffline().getListMutation().length).toEqual(1);
                expect(environment.getStoreOffline().getListMutation()[0].request.payload.operation).toEqual(operation);
                expect(onExecute).toHaveBeenCalledTimes(0);
                expect(onComplete).toHaveBeenCalledTimes(0);
                onlineGetter.mockReturnValue(true);
                window.dispatchEvent(new Event('online'));
                expect(environment.isOnline()).toBeTruthy();
                jest.runAllTimers();
                subject.next({
                    data: {
                        commentCreate: {
                            comment: {
                                id: commentID,
                                body: {
                                    text: 'Gave Relay',
                                },
                            },
                        },
                    },
                });
                subject.complete();
                jest.runAllTimers();
                expect(start).toHaveBeenCalledTimes(1);
                expect(onExecute).toHaveBeenCalledTimes(1);
                expect(onComplete).toHaveBeenCalledTimes(1);
                expect(environment.getStoreOffline().getListMutation().length).toEqual(0);
            });

            it('onExecute onDiscard', () => {
                const offlineOptions = {
                    start,
                    onExecute,
                    onDiscard,
                    onPublish,
                } as any;
                environment.setOfflineOptions(offlineOptions);
                onlineGetter = jest.spyOn(window.navigator, 'onLine', 'get');
                onlineGetter.mockReturnValue(false);
                environment.hydrate();
                jest.runAllTimers();
                expect(environment.isOnline()).not.toBeTruthy();
                environment.executeMutation({ operation }).subscribe(callbacks);
                jest.runAllTimers();
                expect(onPublish).toHaveBeenCalledTimes(1);
                expect(environment.getStoreOffline().getListMutation().length).toEqual(1);
                expect(environment.getStoreOffline().getListMutation()[0].request.payload.operation).toEqual(operation);
                expect(onExecute).toHaveBeenCalledTimes(0);
                expect(onComplete).toHaveBeenCalledTimes(0);
                onlineGetter.mockReturnValue(true);
                window.dispatchEvent(new Event('online'));
                expect(environment.isOnline()).toBeTruthy();
                jest.runAllTimers();
                subject.error(new Error('wtf'));
                jest.runAllTimers();
                expect(start).toHaveBeenCalledTimes(1);
                expect(onComplete).toHaveBeenCalledTimes(0);
                expect(onDiscard).toHaveBeenCalledTimes(1);
                expect(environment.getStoreOffline().getListMutation().length).toEqual(0);
            });
        });

        describe('update store', () => {
            beforeEach(() => {
                jest.resetModules();
                onlineGetter = jest.spyOn(window.navigator, 'onLine', 'get');
                onlineGetter.mockReturnValue(false);
                environment.hydrate();
                jest.runAllTimers();
            });
            it('commits optimistic response with fragment spread', () => {
                operation = createOperationDescriptor(CreateCommentWithSpreadMutation, variables);

                const selector = createReaderSelector(CommentFragment, commentID, {}, queryOperation.request);
                const snapshot = environment.lookup(selector);
                const callback = jest.fn();
                environment.subscribe(snapshot, callback);

                environment
                    .executeMutation({
                        operation,
                        optimisticResponse: {
                            commentCreate: {
                                comment: {
                                    id: commentID,
                                    body: {
                                        text: 'Give Relay',
                                    },
                                },
                            },
                        },
                    })
                    .subscribe(callbacks);
                jest.runAllTimers();

                expect(complete).toBeCalled();
                expect(error).not.toBeCalled();
                expect(callback.mock.calls.length).toBe(1);
                expect(callback.mock.calls[0][0].data).toEqual({
                    id: commentID,
                    body: {
                        text: 'Give Relay',
                    },
                });
            });
            it('commits optimistic updater response with fragment spread', () => {
                operation = createOperationDescriptor(CreateCommentWithSpreadMutation, variables);

                const selector = createReaderSelector(CommentFragment, commentID, {}, queryOperation.request);
                const snapshot = environment.lookup(selector);
                const callback = jest.fn();
                environment.subscribe(snapshot, callback);

                const callOptimisticUpdate = jest.fn();

                environment
                    .executeMutation({
                        operation,
                        optimisticUpdater: (_store) => {
                            callOptimisticUpdate();
                            const comment = _store.create(commentID, 'Comment');
                            comment.setValue(commentID, 'id');
                            const body = _store.create(commentID + '.text', 'Text');
                            comment.setLinkedRecord(body, 'body');
                            body.setValue('Give Relay', 'text');
                        },
                    })
                    .subscribe(callbacks);
                jest.runAllTimers();

                expect(complete).toBeCalled();
                expect(error).not.toBeCalled();
                expect(callOptimisticUpdate.mock.calls.length).toBe(2);
                expect(callback.mock.calls.length).toBe(1);
                expect(callback.mock.calls[0][0].data).toEqual({
                    id: commentID,
                    body: {
                        text: 'Give Relay',
                    },
                });
            });

            it('commits optimistic response + updater response with fragment spread', () => {
                operation = createOperationDescriptor(CreateCommentWithSpreadMutation, variables);

                const selector = createReaderSelector(CommentFragment, commentID, {}, queryOperation.request);
                const snapshot = environment.lookup(selector);
                const callback = jest.fn();
                environment.subscribe(snapshot, callback);

                environment
                    .executeMutation({
                        operation,
                        optimisticResponse: {
                            commentCreate: {
                                comment: {
                                    id: commentID,
                                    body: {
                                        text: 'Give Relay',
                                    },
                                },
                            },
                        },
                        updater: (_store) => {
                            const comment = _store.get(commentID);
                            if (!comment) {
                                throw new Error('Expected comment to be in the store');
                            }
                            const body = comment.getLinkedRecord('body');
                            if (!body) {
                                throw new Error('Expected comment to have a body');
                            }
                            const bodyValue: string | null = body.getValue('text');
                            if (bodyValue == null) {
                                throw new Error('Expected comment body to have text');
                            }
                            body.setValue(bodyValue.toUpperCase(), 'text');
                        },
                    })
                    .subscribe(callbacks);
                jest.runAllTimers();

                expect(complete).toBeCalled();
                expect(error).not.toBeCalled();
                expect(callback.mock.calls.length).toBe(2);
                expect(callback.mock.calls[0][0].data).toEqual({
                    id: commentID,
                    body: {
                        text: 'Give Relay',
                    },
                });
                expect(callback.mock.calls[1][0].data).toEqual({
                    id: commentID,
                    body: {
                        text: 'GIVE RELAY',
                    },
                });
            });
        });
    });
});
