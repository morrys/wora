import OfflineFirst, { OfflineFirstOptions } from "@wora/offline-first";
import { CacheOptions } from "@wora/cache-persist";
import { v4 as uuid } from "uuid";
import { execute, ApolloLink } from 'apollo-link';
import { multiplex } from 'apollo-client/util/observables';
import observableToPromise, { Options } from 'apollo-client/util/observableToPromise';
import { getOperationName,} from 'apollo-utilities';
import { MutationOptions } from "apollo-client/core/watchQueryOptions";
import { OperationVariables } from "apollo-client/core/types";

export type Payload = {
    mutation: any,
    variables?: any,
    context?: any,
    optimisticResponse?: any,
}

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
export type OfflineOptions<T> = Omit<OfflineFirstOptions<T>, "execute"> & {
    link?: ApolloLink;
};


class ApolloStoreOffline {


    static create(client,
        persistOptions:CacheOptions = {},
        offlineOptions:OfflineOptions<Payload> = {}, ) {
        const persistOptionsStoreOffline = {
            prefix: 'apollo-offline',
            serialize: true,
            ...persistOptions,
        };

        const { 
            onComplete, 
            onDiscard, 
            link, 
            manualExecution, 
            finish,
            onPublish
         } = offlineOptions;

        const options:OfflineFirstOptions<Payload> = {
            manualExecution,
            execute: (offlineRecord) => executeMutation(client, link, offlineRecord),
            onComplete: (options) => complete(client, onComplete, options),
            onDiscard: (options) => discard(client, onDiscard, options),
        }
        if(onPublish) {
            options.onPublish = onPublish;
        }
        if(finish) {
            options.finish = finish;
        }
        return new OfflineFirst(options, persistOptionsStoreOffline);
    }
}


function complete(client, onComplete = (options => true), options) {
    const { offlineRecord, response } = options;
    const { id } = offlineRecord;
    return onComplete({ id, offlinePayload: offlineRecord, response: response[0] });

}

function discard(client, onDiscard = (options => true), options) {
    const { offlineRecord, error } = options;
    const { id } = offlineRecord;
    if (onDiscard({ id, offlinePayload: offlineRecord, error })) {
        const { request: { backup, sink } } = offlineRecord;
        return true;
    } else {
        return false;
    }
}

async function executeMutation(client, link:ApolloLink = client.link, offlineRecord) {
    const { request: { payload: { mutation, variables, context } }, id } = offlineRecord;
    const query = client.queryManager.transform(mutation).document;
    const operation = {
        query,
        variables,
        operationName: getOperationName(query) || void 0,
        context: client.queryManager.prepareContext({
            ...context,
            forceFetch: true
        }),
    };
    const options: Options = { observable: (multiplex(execute(link, operation)) as any) };
    return observableToPromise(options, result => result);
}

export function publish<T = any, TVariables = OperationVariables>(client, mutationOptions: MutationOptions) {

    const {
        context,
        optimisticResponse,
        update,
        fetchPolicy,
        variables,
        mutation,
        updateQueries,
        ...otherOptions
    } = mutationOptions;


    const result = { data: optimisticResponse };
    const id = uuid();
    if (fetchPolicy !== 'no-cache') {

        client.store.markMutationInit({
            mutationId: id,
            document: mutation,
            variables,
            updateQueries,
            update,
            optimisticResponse
        });

        client.queryManager.broadcastQueries();
    }

    const payload: Payload = {
        mutation,
        variables,
        context,
        optimisticResponse,
    };
    const request = {
        payload,
        backup: { ...client.cache.data.getState() },
        sink: {...client.cache.optimisticData.data}
    };


    return client.getStoreOffline().publish({ id, request, serial: true }).then(offlineRecord => {
        if (fetchPolicy !== 'no-cache') {

            client.store.markMutationResult({
                mutationId: offlineRecord.id,
                result,
                document: mutation,
                variables,
                updateQueries, // TODO: populate this?
                update
            });

            client.store.markMutationComplete({ mutationId: id, optimisticResponse: true });

            client.queryManager.broadcastQueries();

        }
        return optimisticResponse;
    }).catch(error => {
        client.store.markMutationComplete({ mutationId: id, optimisticResponse: true });
        throw error;
    });
}

export default ApolloStoreOffline;