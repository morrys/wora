/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 * @emails oncall+relay
 */

// flowlint ambiguous-object-type:error

'use strict';

import { Store as RelayModernStore, RecordSource, Environment as RelayModernEnvironment } from '../src';
import { Network as RelayNetwork, Observable as RelayObservable, createOperationDescriptor, createReaderSelector } from 'relay-runtime';
import { createPersistedStorage } from '../src-test';
import { graphql } from 'relay-runtime';
const RelayRecordSource = {
    create: (data?: any) => new RecordSource({ storage: createPersistedStorage(), initialState: { ...data } }),
};

describe('executeMutation()', () => {
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

    beforeEach(async () => {
        jest.resetModules();
        commentID = 'comment-id';
        CommentFragment = graphql`
            fragment RelayModernEnvironmentExecuteMutationTestCommentFragment on Comment {
                id
                body {
                    text
                }
            }
        `;
        CreateCommentWithSpreadMutation = graphql`
            mutation RelayModernEnvironmentExecuteMutationTestCreateCommentWithSpreadMutation($input: CommentCreateInput!) {
                commentCreate(input: $input) {
                    comment {
                        ...RelayModernEnvironmentExecuteMutationTestCommentFragment
                    }
                }
            }
        `;
        CreateCommentMutation = graphql`
            mutation RelayModernEnvironmentExecuteMutationTestCreateCommentMutation($input: CommentCreateInput!) {
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

        CommentQuery = graphql`
            query RelayModernEnvironmentExecuteMutationTestCommentQuery($id: ID!) {
                node(id: $id) {
                    id
                    ...RelayModernEnvironmentExecuteMutationTestCommentFragment
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
        store = new RelayModernStore(source);
        environment = new RelayModernEnvironment({
            network: RelayNetwork.create(fetch),
            store,
        });
        await environment.hydrate();
        complete = jest.fn();
        error = jest.fn();
        callbacks = { complete, error };
    });

    it('fetches the mutation with the provided fetch function', () => {
        environment.executeMutation({ operation }).subscribe({});
        expect(fetch.mock.calls.length).toBe(1);
        expect(fetch.mock.calls[0][0]).toEqual(CreateCommentMutation.params);
        expect(fetch.mock.calls[0][1]).toEqual(variables);
        expect(fetch.mock.calls[0][2]).toEqual({ force: true });
    });

    it('executes the optimistic updater immediately', () => {
        const selector = createReaderSelector(CommentFragment, commentID, {}, queryOperation.request);
        const snapshot = environment.lookup(selector);
        const callback = jest.fn();
        environment.subscribe(snapshot, callback);

        environment
            .executeMutation({
                operation,
                optimisticUpdater: (_store) => {
                    const comment = _store.create(commentID, 'Comment');
                    comment.setValue(commentID, 'id');
                    const body = _store.create(commentID + '.text', 'Text');
                    comment.setLinkedRecord(body, 'body');
                    body.setValue('Give Relay', 'text');
                },
            })
            .subscribe(callbacks);
        expect(complete).not.toBeCalled();
        expect(error).not.toBeCalled();
        expect(callback.mock.calls.length).toBe(1);
        expect(callback.mock.calls[0][0].data).toEqual({
            id: commentID,
            body: {
                text: 'Give Relay',
            },
        });
    });

    it('executes the optimistic updater immediately, does not mark mutation as being in flight in operation tracker', () => {
        const selector = createReaderSelector(CommentFragment, commentID, {}, queryOperation.request);
        const snapshot = environment.lookup(selector);
        const callback = jest.fn();
        environment.subscribe(snapshot, callback);

        environment
            .executeMutation({
                operation,
                optimisticUpdater: (_store) => {
                    const comment = _store.create(commentID, 'Comment');
                    comment.setValue(commentID, 'id');
                    const body = _store.create(commentID + '.text', 'Text');
                    comment.setLinkedRecord(body, 'body');
                    body.setValue('Give Relay', 'text');
                },
            })
            .subscribe(callbacks);
        expect(complete).not.toBeCalled();
        expect(error).not.toBeCalled();
        expect(callback).toBeCalledTimes(1);
        // result tested in previous test

        // The mutation affecting the query should not be marked as in flight yet
        expect(environment.getOperationTracker().getPendingOperationsAffectingOwner(queryOperation.request)).toBe(null);
    });

    it('reverts the optimistic update if disposed', () => {
        const selector = createReaderSelector(CommentFragment, commentID, {}, queryOperation.request);
        const snapshot = environment.lookup(selector);
        const callback = jest.fn();
        environment.subscribe(snapshot, callback);

        const subscription = environment
            .executeMutation({
                operation,
                optimisticUpdater: (_store) => {
                    const comment = _store.create(commentID, 'Comment');
                    comment.setValue(commentID, 'id');
                    const body = _store.create(commentID + '.text', 'Text');
                    comment.setLinkedRecord(body, 'body');
                    body.setValue('Give Relay', 'text');
                },
            })
            .subscribe(callbacks);
        callback.mockClear();
        subscription.unsubscribe();
        expect(complete).not.toBeCalled();
        expect(error).not.toBeCalled();
        expect(callback.mock.calls.length).toBe(1);
        expect(callback.mock.calls[0][0].data).toEqual(undefined);
    });

    it('reverts the optimistic update and commits the server payload', () => {
        const selector = createReaderSelector(CommentFragment, commentID, {}, queryOperation.request);
        const snapshot = environment.lookup(selector);
        const callback = jest.fn();
        environment.subscribe(snapshot, callback);

        environment
            .executeMutation({
                operation,
                optimisticUpdater: (_store) => {
                    const comment = _store.create(commentID, 'Comment');
                    comment.setValue(commentID, 'id');
                    const body = _store.create(commentID + '.text', 'Text');
                    comment.setLinkedRecord(body, 'body');
                    body.setValue('Give Relay', 'text');
                },
            })
            .subscribe(callbacks);

        callback.mockClear();
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

        expect(complete).toBeCalled();
        expect(error).not.toBeCalled();
        expect(callback.mock.calls.length).toBe(1);
        expect(callback.mock.calls[0][0].data).toEqual({
            id: commentID,
            body: {
                text: 'Gave Relay',
            },
        });
    });

    it('commits the server payload and runs the updater', () => {
        const selector = createReaderSelector(CommentFragment, commentID, {}, queryOperation.request);
        const snapshot = environment.lookup(selector);
        const callback = jest.fn();
        environment.subscribe(snapshot, callback);

        environment
            .executeMutation({
                operation,
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

        callback.mockClear();
        subject.next({
            data: {
                commentCreate: {
                    comment: {
                        id: commentID,
                        body: {
                            text: 'Gave Relay', // server data is lowercase
                        },
                    },
                },
            },
        });
        subject.complete();

        expect(complete).toBeCalled();
        expect(error).not.toBeCalled();
        expect(callback.mock.calls.length).toBe(1);
        expect(callback.mock.calls[0][0].data).toEqual({
            id: commentID,
            body: {
                text: 'GAVE RELAY', // converted to uppercase by updater
            },
        });
    });

    it('reverts the optimistic update if the fetch is rejected', () => {
        const selector = createReaderSelector(CommentFragment, commentID, {}, queryOperation.request);
        const snapshot = environment.lookup(selector);
        const callback = jest.fn();
        environment.subscribe(snapshot, callback);

        environment
            .executeMutation({
                operation,
                optimisticUpdater: (_store) => {
                    const comment = _store.create(commentID, 'Comment');
                    comment.setValue(commentID, 'id');
                    const body = _store.create(commentID + '.text', 'Text');
                    comment.setLinkedRecord(body, 'body');
                    body.setValue('Give Relay', 'text');
                },
            })
            .subscribe(callbacks);

        callback.mockClear();
        subject.error(new Error('wtf'));

        expect(complete).not.toBeCalled();
        expect(error).toBeCalled();
        expect(callback.mock.calls.length).toBe(1);
        expect(callback.mock.calls[0][0].data).toEqual(undefined);
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

        expect(complete).not.toBeCalled();
        expect(error).not.toBeCalled();
        expect(callback.mock.calls.length).toBe(1);
        expect(callback.mock.calls[0][0].data).toEqual({
            id: commentID,
            body: {
                text: 'Give Relay',
            },
        });
    });

    it('does not commit the server payload if disposed', () => {
        const selector = createReaderSelector(CommentFragment, commentID, {}, queryOperation.request);
        const snapshot = environment.lookup(selector);
        const callback = jest.fn();
        environment.subscribe(snapshot, callback);

        const subscription = environment
            .executeMutation({
                operation,
                optimisticUpdater: (_store) => {
                    const comment = _store.create(commentID, 'Comment');
                    comment.setValue(commentID, 'id');
                    const body = _store.create(commentID + '.text', 'Text');
                    comment.setLinkedRecord(body, 'body');
                    body.setValue('Give Relay', 'text');
                },
            })
            .subscribe(callbacks);

        subscription.unsubscribe();
        callback.mockClear();
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
        expect(complete).not.toBeCalled();
        expect(error).not.toBeCalled();
        // The optimistic update has already been reverted
        expect(callback.mock.calls.length).toBe(0);

        // The mutation affecting the query should not be marked as in flight
        // since it was disposed
        expect(environment.getOperationTracker().getPendingOperationsAffectingOwner(queryOperation.request)).toBe(null);
    });
});
