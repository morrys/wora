/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @emails oncall+relay
 */

'use strict';

import { fetchQuery_DEPRECATED as fetchQuery } from '../src';

import { createOperationDescriptor } from 'relay-runtime';
import { createMockEnvironment, generateAndCompile } from '../src-test';

//jest.useFakeTimers();
describe('fetchQuery', () => {
    describe('fetchQuery with hydrate', () => {
        let cacheConfig;
        let environment;
        let operation;
        let query;
        let variables;

        beforeEach(() => {
            jest.resetModules();

            environment = createMockEnvironment();
            ({ ActorQuery: query } = generateAndCompile(`
      query ActorQuery($fetchSize: Boolean!) {
        me {
          name
          profilePicture(size: 42) @include(if: $fetchSize) {
            uri
          }
        }
      }
    `));
            variables = { fetchSize: false };
            operation = createOperationDescriptor(query, variables);
        });

        it('fetches the query', async () => {
            cacheConfig = { force: true };
            fetchQuery(environment, query, variables, cacheConfig);
            await environment.mock.hydrate();
            expect(environment.execute.mock.calls.length).toBe(1);
            const args = environment.execute.mock.calls[0][0];
            const checkOperation = createOperationDescriptor(query, variables, cacheConfig);
            expect(args).toEqual({ operation: checkOperation });
        });

        it('resolves with the query results after first value', async () => {
            const promise = fetchQuery(environment, query, variables);
            await environment.mock.hydrate();
            environment.mock.nextValue(query, {
                data: {
                    me: {
                        id: '842472',
                        name: 'Joe',
                    },
                },
            });
            expect(await promise).toEqual({
                me: {
                    name: 'Joe',
                },
            });
        });

        it('rejects with query errors', async () => {
            const promise = fetchQuery(environment, query, variables);
            await environment.mock.hydrate();
            const error = new Error('wtf');
            environment.mock.reject(query, error);
            expect(await promise.catch((err) => err)).toBe(error);
        });
    });

    describe('fetchQuery without hydrate', () => {
        let cacheConfig;
        let environment;
        let operation;
        let query;
        let variables;

        beforeEach(async () => {
            jest.resetModules();

            environment = createMockEnvironment();
            ({ ActorQuery: query } = generateAndCompile(`
    query ActorQuery($fetchSize: Boolean!) {
      me {
        name
        profilePicture(size: 42) @include(if: $fetchSize) {
          uri
        }
      }
    }
  `));
            variables = { fetchSize: false };
            operation = createOperationDescriptor(query, variables);
            await environment.hydrate();
        });

        it('fetches the query', () => {
            cacheConfig = { force: true };
            fetchQuery(environment, query, variables, cacheConfig);
            expect(environment.execute.mock.calls.length).toBe(1);
            const args = environment.execute.mock.calls[0][0];
            const operationCache = createOperationDescriptor(query, variables, cacheConfig);
            expect(args).toEqual({ operation: operationCache });
        });

        it('resolves with the query results after first value', async () => {
            const promise = fetchQuery(environment, query, variables);
            environment.mock.nextValue(query, {
                data: {
                    me: {
                        id: '842472',
                        name: 'Joe',
                    },
                },
            });
            expect(await promise).toEqual({
                me: {
                    name: 'Joe',
                },
            });
        });

        it('rejects with query errors', async () => {
            const promise = fetchQuery(environment, query, variables);
            const error = new Error('wtf');
            environment.mock.reject(query, error);
            expect(await promise.catch((err) => err)).toBe(error);
        });
    });
});
