import ApolloStore from '@wora/apollo-cache';
import { ApolloClient, NormalizedCacheObject, ApolloClientOptions, OperationVariables, ObservableQuery } from '@apollo/client';
import { ApolloLink, execute } from '@apollo/client';
import observableToPromise, { Options, multiplex } from './utils/observableToPromise';
import { getOperationName } from '@apollo/client/utilities/graphql/getFromAST';
import { MutationOptions } from '@apollo/client/core/watchQueryOptions';
import { graphQLResultHasError, tryFunctionOrLogError } from '@apollo/client/utilities/common/errorHandling';

import { CacheOptions } from '@wora/cache-persist';
import { OfflineFirst, OfflineFirstOptions, OfflineRecordCache } from '@wora/offline-first';
import { ApolloCache } from '@wora/apollo-cache';
import { v4 as uuid } from 'uuid';
import { Payload, OfflineApolloClientOptions, OfflineOptions } from './ApolloOfflineTypes';

const { hasOwnProperty } = Object.prototype;

export class ApolloClientOffline extends ApolloClient<NormalizedCacheObject> {
    private apolloStoreOffline: OfflineFirst<Payload>;
    private rehydrated = typeof window === 'undefined';
    private promisesRestore;

    constructor(apolloOptions: OfflineApolloClientOptions, persistOptions: CacheOptions = {}) {
        super(apolloOptions);
        (this as any).queryManager.isOnline = (): boolean => this.isOnline();
        const persistOptionsStoreOffline = {
            prefix: 'apollo-offline',
            serialize: true,
            ...persistOptions,
        };
        this.apolloStoreOffline = new OfflineFirst<Payload>(persistOptionsStoreOffline);
        this.setOfflineOptions();
        if (this.rehydrated) {
            this.promisesRestore = Promise.resolve(true);
        }

        const originalFetchQuery = (this as any).queryManager.fetchQuery;
        (this as any).queryManager.fetchQuery = function (queryId, options, fetchType, fetchMoreForQueryId): any {
            const oldFetchPolicy = options.fetchPolicy;
            if (!this.isOnline()) {
                options.fetchPolicy = 'cache-only';
            }
            const result = originalFetchQuery.apply(this, [queryId, options, fetchType, fetchMoreForQueryId]);
            options.fetchPolicy = oldFetchPolicy;
            return result;
        };
    }

    public setOfflineOptions(offlineOptions: OfflineOptions<Payload> = {}): void {
        const { onComplete, onDiscard, link, ...others } = offlineOptions;
        const options: OfflineFirstOptions<Payload> = {
            execute: (offlineRecord) => this.executeOfflineMutation(link, offlineRecord),
            onComplete: (o) => complete(this, onComplete, o),
            onDiscard: (o) => discard(this, onDiscard, o),
            ...others,
        };
        this.apolloStoreOffline.setOfflineOptions(options);
    }

    public dispose(): void {
        this.getStoreOffline().dispose();
    }

    public hydrate(): Promise<boolean> {
        if (!this.promisesRestore) {
            this.promisesRestore = Promise.all([this.getStoreOffline().hydrate(), (this.cache as ApolloCache).hydrate()])
                .then((_result) => {
                    (this.cache as any).broadcastWatches();
                    (this as any).queryManager.broadcastQueries();
                    this.rehydrated = true;
                    return true;
                })
                .catch((error) => {
                    this.rehydrated = false;
                    this.promisesRestore = null;
                    throw error;
                });
        }

        return this.promisesRestore;
    }

    public getStoreOffline(): OfflineFirst<Payload> {
        return this.apolloStoreOffline;
    }

    public isRehydrated(): boolean {
        return this.rehydrated;
    }

    public isOnline(): boolean {
        return this.getStoreOffline().isOnline();
    }

    public watchQuery<T = any, TVariables = OperationVariables>(options: any): ObservableQuery<T, TVariables> {
        const oldFetchPolicy = options.fetchPolicy;
        if (!this.isOnline()) {
            options.fetchPolicy = 'cache-only';
        }
        const result: ObservableQuery<T, TVariables> = super.watchQuery(options);
        result.options.fetchPolicy = oldFetchPolicy;
        return result;
    }

    public mutateOffline<T>(mutationOptions: MutationOptions): Promise<FetchResult<T>> {
        const { context, update, fetchPolicy, variables, mutation, updateQueries: updateQueriesByName } = mutationOptions;

        const generateUpdateQueriesInfo: () => {
            [queryId: string]: QueryWithUpdater;
        } = () => {
            const ret: { [queryId: string]: QueryWithUpdater } = {};

            if (updateQueriesByName) {
                (this as any).queries.forEach(({ observableQuery }, queryId) => {
                    if (observableQuery) {
                        const { queryName } = observableQuery;
                        if (queryName && hasOwnProperty.call(updateQueriesByName, queryName)) {
                            ret[queryId] = {
                                updater: updateQueriesByName[queryName],
                                query: (this as any).queryStore.get(queryId),
                            };
                        }
                    }
                });
            }

            return ret;
        };

        const optimisticResponse =
            typeof mutationOptions.optimisticResponse === 'function'
                ? mutationOptions.optimisticResponse(variables)
                : mutationOptions.optimisticResponse;

        const result = { data: optimisticResponse };
        const id = uuid();
        // optimistic response is required
        if (fetchPolicy !== 'no-cache' && optimisticResponse) {
            this.store.markMutationInit({
                variables,
                updateQueries: generateUpdateQueriesInfo(),
                update,
                optimisticResponse,
                document: mutation,
                mutationId: id,
            });

            (this as any).queryManager.broadcastQueries();
        }

        const payload: Payload = {
            mutation,
            variables,
            context,
            optimisticResponse,
        };

        const sink = (this as any).cache.optimisticData.data;
        const backup = {};
        const state = (this as any).cache.data.getState();
        Object.keys(sink).forEach((key) => (backup[key] = state[key]));

        const request = {
            payload,
            backup,
            sink,
        };

        return this.getStoreOffline()
            .publish({ id, request, serial: true })
            .then((offlineRecord: OfflineRecordCache<Payload>) => {
                if (fetchPolicy !== 'no-cache' && optimisticResponse) {
                    this.store.markMutationResult({
                        result,
                        variables,
                        updateQueries: generateUpdateQueriesInfo(),
                        update,
                        mutationId: offlineRecord.id,
                        document: mutation,
                    });

                    this.store.markMutationComplete({
                        mutationId: id,
                        optimisticResponse,
                    });

                    (this as any).queryManager.broadcastQueries();
                }
                return result;
            })
            .catch((error: Error) => {
                this.store.markMutationComplete({
                    mutationId: id,
                    optimisticResponse,
                });
                (this as any).queryManager.broadcastQueries();
                throw error;
            });
    }

    public mutate<T = any, TVariables = OperationVariables>(options: MutationOptions<T, TVariables>): Promise<FetchResult<T>> {
        if (!this.isOnline()) {
            return this.mutateOffline(options);
        }
        return super.mutate(options);
    }

    private executeOfflineMutation(link: ApolloLink = this.link, offlineRecord: OfflineRecordCache<Payload>): Promise<any> {
        const {
            request: {
                payload: { mutation, variables, context },
            },
        } = offlineRecord;
        const query = (this as any).queryManager.transform(mutation).document;
        const operation = {
            query,
            variables,
            operationName: getOperationName(query) || void 0,
            context: (this as any).queryManager.prepareContext({
                ...context,
                forceFetch: true,
            }),
        };
        const options: Options = {
            observable: multiplex(execute(link, operation)) as any,
        };
        return observableToPromise(options, (result) => result);
    }
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
