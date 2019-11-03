import OfflineFirst, { OfflineFirstOptions, OfflineRecordCache } from '@wora/offline-first';
import { CacheOptions } from '@wora/cache-persist';
import { v4 as uuid } from 'uuid';
import { execute, ApolloLink } from 'apollo-link';
import { multiplex } from 'apollo-client/util/observables';
import observableToPromise, { Options } from 'apollo-client/util/observableToPromise';
import { getOperationName } from 'apollo-utilities';
import { MutationOptions } from 'apollo-client/core/watchQueryOptions';

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
    const { context, optimisticResponse, update, fetchPolicy, variables, mutation, updateQueries } = mutationOptions;

    const result = { data: optimisticResponse };
    const id = uuid();
    // optimistic response is required
    if (fetchPolicy !== 'no-cache') {
        client.store.markMutationInit({
            variables,
            updateQueries,
            update,
            optimisticResponse,
            document: mutation,
            mutationId: id,
        });

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
    const state = client.cache.data.getState();
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
                client.store.markMutationResult({
                    result,
                    variables,
                    updateQueries,
                    update,
                    mutationId: offlineRecord.id,
                    document: mutation,
                });

                client.store.markMutationComplete({
                    mutationId: id,
                    optimisticResponse: true,
                });

                client.queryManager.broadcastQueries();
            }
            return result;
        })
        .catch((error: Error) => {
            client.store.markMutationComplete({
                mutationId: id,
                optimisticResponse: true,
            });
            throw error;
        });
}

export default ApolloStoreOffline;
