import OfflineFirst, { OfflineFirstOptions, OfflineRecordCache } from '@wora/offline-first';
import { CacheOptions } from '@wora/cache-persist';
import { v4 as uuid } from 'uuid';
import { ApolloLink, execute } from '@apollo/client';
import observableToPromise, { Options, multiplex } from './utils/observableToPromise';
import { getOperationName } from '@apollo/client/utilities/graphql/getFromAST';
import { MutationOptions } from '@apollo/client/core/watchQueryOptions';
import { graphQLResultHasError, tryFunctionOrLogError } from '@apollo/client/utilities/common/errorHandling';
export type Payload = {
    mutation: any;
    variables?: any;
    context?: any;
    optimisticResponse?: any;
};

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type OfflineOptions<T> = Omit<OfflineFirstOptions<T>, 'execute'> & {
    link?: ApolloLink;
};

export interface IApolloStoreOffline {
    storeOffline: OfflineFirst<Payload>;
    publish: (client, mutationOptions: MutationOptions) => Promise<any>;
    setOfflineOptions: (environment, offlineOptions?: OfflineOptions<Payload>) => void;
}

const { hasOwnProperty } = Object.prototype;

class ApolloStoreOffline {
    public static create(persistOptions: CacheOptions = {}): IApolloStoreOffline {
        const persistOptionsStoreOffline = {
            prefix: 'apollo-offline',
            serialize: true,
            ...persistOptions,
        };
        const storeOffline = new OfflineFirst<Payload>(persistOptionsStoreOffline);
        return {
            storeOffline,
            publish,
            setOfflineOptions,
        };
    }
}

function setOfflineOptions(client, offlineOptions: OfflineOptions<Payload> = {}): void {
    const { onComplete, onDiscard, link, ...others } = offlineOptions;

    const options: OfflineFirstOptions<Payload> = {
        execute: (offlineRecord) => executeMutation(client, link, offlineRecord),
        onComplete: (o) => complete(client, onComplete, o),
        onDiscard: (o) => discard(client, onDiscard, o),
        ...others,
    };
    client.getStoreOffline().setOfflineOptions(options);
}

function complete(client: any, onComplete = (_o: any): Promise<boolean> => Promise.resolve(true), options: any): Promise<boolean> {
    const { offlineRecord, response } = options;
    const { id } = offlineRecord;
    return onComplete({
        id,
        offlinePayload: offlineRecord,
        response: response[0],
    });
}

function discard(client: any, onDiscard = (_o: any): Promise<boolean> => Promise.resolve(true), options: any): Promise<boolean> {
    const { offlineRecord, error } = options;
    const { id } = offlineRecord;
    // can i use here update query?
    return onDiscard({ id, error, offlinePayload: offlineRecord });
}

function executeMutation(client: any, link: ApolloLink = client.link, offlineRecord: OfflineRecordCache<Payload>): Promise<any> {
    const {
        request: {
            payload: { mutation, variables, context },
        },
    } = offlineRecord;
    const query = client.queryManager.transform(mutation).document;
    const operation = {
        query,
        variables,
        operationName: getOperationName(query) || void 0,
        context: client.queryManager.prepareContext({
            ...context,
            forceFetch: true,
        }),
    };
    const options: Options = {
        observable: multiplex(execute(link, operation)) as any,
    };
    return observableToPromise(options, (result) => result);
}

export function publish(client: any, mutationOptions: MutationOptions): Promise<any> {
    const { context, optimisticResponse, update, fetchPolicy, variables, mutation, updateQueries: updateQueriesByName } = mutationOptions;

    const result = { data: optimisticResponse };
    const id = uuid();

    const generateUpdateQueriesInfo: () => {
        [queryId: string]: any;
    } = () => {
        const ret: { [queryId: string]: any } = {};

        if (updateQueriesByName) {
            this.queries.forEach(({ observableQuery }, queryId) => {
                if (observableQuery) {
                    const { queryName } = observableQuery;
                    if (queryName && hasOwnProperty.call(updateQueriesByName, queryName)) {
                        ret[queryId] = {
                            updater: updateQueriesByName[queryName],
                            query: this.queryStore.get(queryId),
                        };
                    }
                }
            });
        }

        return ret;
    };

    const mutationId = id;
    // optimistic response is required
    if (fetchPolicy !== 'no-cache') {
        client.queryManager.cache.recordOptimisticTransaction((cache) => {
            markMutationResult(
                {
                    mutationId,
                    result,
                    document: mutation,
                    variables: variables,
                    queryUpdatersById: generateUpdateQueriesInfo(),
                    update,
                },
                cache,
            );
        }, id);

        client.queryManager.broadcastQueries();
    }

    const payload: Payload = {
        mutation,
        variables,
        context,
        optimisticResponse,
    };

    const sink = client.cache.optimisticData.data;
    const backup = {};
    const state = client.cache.data.cache.getState(); // todo better in apollo-cache
    Object.keys(sink).forEach((key) => (backup[key] = state[key]));

    const request = {
        payload,
        backup,
        sink,
    };

    return client
        .getStoreOffline()
        .publish({ id, request, serial: true })
        .then((offlineRecord: OfflineRecordCache<Payload>) => {
            if (fetchPolicy !== 'no-cache') {
                markMutationResult(
                    {
                        mutationId,
                        result,
                        document: mutation,
                        variables,
                        queryUpdatersById: generateUpdateQueriesInfo(),
                        update,
                    },
                    client.queryManager.cache,
                );

                client.queryManager.cache.removeOptimistic(mutationId);
                client.queryManager.broadcastQueries();
            }
            return result;
        })
        .catch((error: Error) => {
            client.queryManager.cache.removeOptimistic(mutationId);
            throw error;
        });
}

function markMutationResult(
    mutation: {
        mutationId: string;
        result: any;
        document: any;
        variables: any;
        queryUpdatersById: Record<string, any>;
        update: ((proxy: any, mutationResult: Object) => void) | undefined;
    },
    cache: any,
) {
    // Incorporate the result from this mutation into the store
    if (!graphQLResultHasError(mutation.result)) {
        const cacheWrites: any[] = [
            {
                result: mutation.result.data,
                dataId: 'ROOT_MUTATION',
                query: mutation.document,
                variables: mutation.variables,
            },
        ];

        const { queryUpdatersById } = mutation;
        if (queryUpdatersById) {
            Object.keys(queryUpdatersById).forEach((id) => {
                const { query, updater } = queryUpdatersById[id];

                // Read the current query result from the store.
                const { result: currentQueryResult, complete } = cache.diff({
                    query: query.document,
                    variables: query.variables,
                    returnPartialData: true,
                    optimistic: false,
                });

                if (complete) {
                    // Run our reducer using the current query result and the mutation result.
                    const nextQueryResult = tryFunctionOrLogError(() =>
                        updater(currentQueryResult, {
                            mutationResult: mutation.result,
                            queryName: getOperationName(query.document) || undefined,
                            queryVariables: query.variables,
                        }),
                    );

                    // Write the modified result back into the store if we got a new result.
                    if (nextQueryResult) {
                        cacheWrites.push({
                            result: nextQueryResult,
                            dataId: 'ROOT_QUERY',
                            query: query.document,
                            variables: query.variables,
                        });
                    }
                }
            });
        }

        cache.performTransaction((c) => {
            cacheWrites.forEach((write) => c.write(write));

            // If the mutation has some writes associated with it then we need to
            // apply those writes to the store by running this reducer again with a
            // write action.
            const { update } = mutation;
            if (update) {
                tryFunctionOrLogError(() => update(c, mutation.result));
            }
        });
    }
}

export default ApolloStoreOffline;
