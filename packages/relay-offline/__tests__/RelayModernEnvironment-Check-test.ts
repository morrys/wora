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
import { Network as RelayNetwork, createOperationDescriptor } from 'relay-runtime';
import { generateAndCompile, createPersistedStorage } from '../src-test';
const RelayRecordSource = {
    create: (data?: any): RecordSource => new RecordSource({ storage: createPersistedStorage(), initialState: { ...data } }),
};

describe('check()', () => {
    let environment;
    let operationDescriptor;
    let ParentQuery;
    let source;
    let store;

    beforeEach(async () => {
        jest.resetModules();
        ({ ParentQuery } = generateAndCompile(`
        query ParentQuery($size: [Int]!) {
          me {
            id
            name
            profilePicture(size: $size) {
              uri
            }
          }
        }
      `));

        source = RelayRecordSource.create();
        store = new RelayModernStore(source);
        environment = new RelayModernEnvironment({
            network: RelayNetwork.create(jest.fn()),
            store,
        });
        operationDescriptor = createOperationDescriptor(ParentQuery, { size: 32 });
        await environment.hydrate();
    });

    it('returns available if all data exists in the environment', () => {
        environment.commitPayload(operationDescriptor, {
            me: {
                id: '4',
                name: 'Zuck',
                profilePicture: {
                    uri: 'https://...',
                },
            },
        });
        expect(environment.check(operationDescriptor)).toEqual({
            status: 'available',
            fetchTime: null,
        });
    });

    it('returns available with fetchTime if all data exists in the environment and the query is retained', () => {
        const fetchTime = Date.now();
        jest.spyOn(global.Date, 'now').mockImplementation(() => fetchTime);
        environment.retain(operationDescriptor);
        environment.commitPayload(operationDescriptor, {
            me: {
                id: '4',
                name: 'Zuck',
                profilePicture: {
                    uri: 'https://...',
                },
            },
        });
        expect(environment.check(operationDescriptor)).toEqual({
            status: 'available',
            fetchTime,
        });
    });
    it('returns missing if data is missing from the environment', () => {
        environment.commitPayload(operationDescriptor, {
            me: {
                id: '4',
                name: 'Zuck',
                profilePicture: {
                    uri: undefined,
                },
            },
        });
        expect(environment.check(operationDescriptor)).toEqual({ status: 'missing' });
    });
});
