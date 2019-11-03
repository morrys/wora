import { CacheOptions } from '@wora/cache-persist';
import { v4 as uuid } from 'uuid';
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

export interface IRelayStoreOffline {
    storeOffline: OfflineFirst<Payload>;
    publish: (environment, mutationOptions) => any;
    setOfflineOptions: (environment, offlineOptions?: OfflineOptions<Payload>) => void;
}

class RelayStoreOffline {
    public static create(persistOptions: CacheOptions = {}): IRelayStoreOffline {
        {
            const persistOptionsStoreOffline = {
                prefix: 'relay-offline',
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
}

function setOfflineOptions(environment, offlineOptions: OfflineOptions<Payload> = {}): void {
    const { onComplete, onDiscard, network, ...others } = offlineOptions;

    const options: OfflineFirstOptions<Payload> = {
        execute: (offlineRecord: any) => executeMutation(environment, network, offlineRecord),
        onComplete: (options: any) => complete(environment, onComplete, options),
        onDiscard: (options: any) => discard(environment, onDiscard, options),
        ...others,
    };
    environment.getStoreOffline().setOfflineOptions(options);
}

function complete(
    environment,
    onComplete = (_o): Promise<boolean> => Promise.resolve(true),
    options: { offlineRecord: OfflineRecordCache<Payload>; response: any },
): Promise<boolean> {
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
    _environment,
    onDiscard = (_o): Promise<boolean> => Promise.resolve(true),
    options: { offlineRecord: OfflineRecordCache<Payload>; error: any },
): Promise<boolean> {
    const { offlineRecord, error } = options;
    const { id } = offlineRecord;
    return onDiscard({ id, offlinePayload: offlineRecord, error });
}

function executeMutation(environment, network = environment.getNetwork(), offlineRecord: OfflineRecordCache<Payload>): Promise<any> {
    const {
        request: { payload },
    } = offlineRecord;
    const operation = payload.operation;
    const uploadables = payload.uploadables;
    const request = operation.request ? operation.request : operation;
    return network.execute(request.node.params, request.variables, { force: true, metadata: offlineRecord }, uploadables).toPromise();
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
        const source = RelayObservable.create((sink) => {
            resolveImmediate(() => {
                // come recuperare i dati che sono stati inseriti? override del publish? dello store?
                const sinkPublish = environment
                    .getStore()
                    .getSource()
                    ._sink.toJSON();
                const backup = {};
                Object.keys(sinkPublish).forEach(
                    (key) =>
                        (backup[key] = environment
                            .getStore()
                            .getSource()
                            ._base.get(key)),
                );

                sink.next({
                    data: optimisticResponse ? optimisticResponse : {},
                });

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
                    .then((_offlineRecord) => {
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
