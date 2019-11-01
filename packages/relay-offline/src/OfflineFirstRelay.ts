import { CacheOptions } from '@wora/cache-persist';
import { v4 as uuid } from 'uuid';
import RelayModernEnvironment from './RelayModernEnvironment';
import * as RelayModernQueryExecutor from 'relay-runtime/lib/store/RelayModernQueryExecutor';
import resolveImmediate from 'relay-runtime/lib/util/resolveImmediate';

import { Network, Observable as RelayObservable } from 'relay-runtime';
import OfflineFirst, { OfflineFirstOptions, OfflineRecordCache, Request } from '@wora/offline-first';

export type Payload = {
    operation: any;
    optimisticResponse?: any;
    uploadables?: any;
};

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type OfflineOptions<T> = Omit<OfflineFirstOptions<T>, 'execute'> & {
    network?: Network;
};

class RelayStoreOffline {
    public static create<Payload>(
        environment: RelayModernEnvironment,
        persistOptions: CacheOptions = {},
        offlineOptions: OfflineOptions<Payload> = {},
    ): OfflineFirst<Payload> {
        const persistOptionsStoreOffline = {
            prefix: 'relay-offline',
            serialize: true,
            ...persistOptions,
        };

        const { onComplete, onDiscard, network, manualExecution, finish, onPublish } = offlineOptions;

        const options: OfflineFirstOptions<Payload> = {
            manualExecution,
            execute: (offlineRecord: any) => executeMutation(environment, network, offlineRecord),
            onComplete: (options: any) => complete(environment, onComplete, options),
            onDiscard: (options: any) => discard(environment, onDiscard, options),
        };
        if (onPublish) {
            options.onPublish = onPublish;
        }
        if (finish) {
            options.finish = finish;
        }
        return new OfflineFirst(options, persistOptionsStoreOffline);
    }
}

function complete(
    environment,
    onComplete = (_o): boolean => true,
    options: { offlineRecord: OfflineRecordCache<Payload>; response: any },
): boolean {
    const { offlineRecord, response } = options;
    const {
        request: { payload },
        id,
    } = offlineRecord;
    const operation = payload.operation;
    const snapshot = environment.lookup(operation.fragment);
    return onComplete({ id, offlinePayload: offlineRecord, snapshot: snapshot.data as any, response });
}

function discard(
    environment,
    onDiscard = (_o): boolean => true,
    options: { offlineRecord: OfflineRecordCache<Payload>; error: any },
): boolean {
    const { offlineRecord, error } = options;
    const { id } = offlineRecord;
    if (onDiscard({ id, offlinePayload: offlineRecord, error })) {
        const {
            request: { backup },
        } = offlineRecord;
        environment.getStore().publish(backup);
        environment.getStore().notify();
        return true;
    } else {
        return false;
    }
}

async function executeMutation(environment, network = environment.getNetwork(), offlineRecord: OfflineRecordCache<Payload>): Promise<any> {
    const {
        request: { payload },
    } = offlineRecord;
    const operation = payload.operation;
    const uploadables = payload.uploadables;
    return network.execute(operation.node.params, operation.variables, { force: true, metadata: offlineRecord }, uploadables).toPromise();
}

export function publish(environment, mutationOptions): any {
    // TODO type observable
    return RelayObservable.create((sink) => {
        const { operation, optimisticResponse, optimisticUpdater, updater, uploadables } = mutationOptions;
        let optimisticConfig;
        if (optimisticResponse || optimisticUpdater) {
            optimisticConfig = {
                operation,
                response: optimisticResponse,
                updater: optimisticUpdater,
            };
        }
        const store = environment.getStore();
        const originalNotify = store.notify;
        const originalPublish = store.publish;
        store.notify = function() {};
        let backup;
        let sinkPublish;

        const source = RelayObservable.create((sink) => {
            store.publish = function(source) {
                sinkPublish = source;
                store.publish = originalPublish;
                store.publish(source);
            };
            resolveImmediate(() => {
                // come recuperare i dati che sono stati inseriti? override del publish? dello store?
                backup = environment.getStore().getSource()._sink;
                sink.next({
                    data: optimisticResponse ? optimisticResponse : {},
                });
                store.notify = originalNotify;
                store.publish = originalPublish;

                const id = uuid();
                const payload: Payload = {
                    operation,
                    optimisticResponse,
                    uploadables,
                };
                const request: Request<Payload> = {
                    payload,
                    backup,
                    sink: sinkPublish,
                };
                environment
                    .getStoreOffline()
                    .publish({ id, request, serial: true })
                    .then((offlineRecord) => {
                        environment.getStore().notify();
                        environment.getStoreOffline().notify();
                        sink.complete();
                    })
                    .catch((error) => {
                        sink.error(error, true);
                    });
            });
        });
        RelayModernQueryExecutor.execute({
            operation,
            operationLoader: environment._operationLoader,
            optimisticConfig,
            publishQueue: environment._publishQueue,
            scheduler: environment._scheduler,
            sink,
            source,
            updater: optimisticResponse ? updater : optimisticUpdater,
            operationTracker: environment._operationTracker,
            getDataID: environment._getDataID,
        });
    });
}

export default RelayStoreOffline;
