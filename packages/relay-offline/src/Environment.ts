import {
    Environment as RelayEnvironment,
    Observable as RelayObservable,
    GraphQLResponse,
    Disposable,
    SelectorStoreUpdater,
    OperationDescriptor,
    UploadableMap,
    Snapshot,
} from 'relay-runtime';

import { EnvironmentConfig } from 'relay-runtime/lib/store/RelayModernEnvironment';

import { Store } from '@wora/relay-store';
import { CacheOptions } from '@wora/cache-persist';
import { OfflineFirst, OfflineFirstOptions, OfflineRecordCache, Request } from '@wora/offline-first';
import resolveImmediate from 'relay-runtime/lib/util/resolveImmediate';
import { v4 as uuid } from 'uuid';
import { Payload, OfflineOptions } from './RelayOfflineTypes';
import warning from 'fbjs/lib/warning';

export class Environment extends RelayEnvironment {
    private _rehydrated = typeof window === 'undefined';
    private _relayStoreOffline: OfflineFirst<Payload>;
    private promisesRestore;

    constructor(config: EnvironmentConfig, persistOfflineOptions: CacheOptions = {}) {
        super(config);
        const persistOptionsStoreOffline = {
            prefix: 'relay-offline',
            serialize: true,
            ...persistOfflineOptions,
        };

        this._relayStoreOffline = new OfflineFirst<Payload>(persistOptionsStoreOffline);
        this.setOfflineOptions();
        if (this._rehydrated) {
            this.promisesRestore = Promise.resolve(true);
        }
        (this as any)._store.setCheckGC(() => this.isOnline()); // todo refactor use listener & holdgc
    }

    public setOfflineOptions(offlineOptions: OfflineOptions<Payload> = {}): void {
        const { onComplete, onDiscard, network, ...others } = offlineOptions;

        const options: OfflineFirstOptions<Payload> = {
            execute: (offlineRecord: OfflineRecordCache<Payload>) => this.executeStoreOffline(network, offlineRecord),
            ...others,
        };
        if (onComplete) {
            options.onComplete = (options: { offlineRecord: OfflineRecordCache<Payload>; response: any }): Promise<boolean> => {
                const { offlineRecord, response } = options;
                const {
                    request: {
                        payload: { operation },
                    },
                    id,
                } = offlineRecord;
                const snapshot = (this as any).lookup(operation.fragment);
                return onComplete({ id, offlinePayload: offlineRecord, snapshot: snapshot.data as Snapshot, response });
            };
        }
        if (onDiscard) {
            options.onDiscard = (options: { offlineRecord: OfflineRecordCache<Payload>; error: Error }): Promise<boolean> => {
                const { offlineRecord, error } = options;
                const { id } = offlineRecord;
                return onDiscard({ id, offlinePayload: offlineRecord, error });
            };
        }
        this._relayStoreOffline.setOfflineOptions(options);
    }

    private executeStoreOffline(network = (this as any).getNetwork(), offline: OfflineRecordCache<Payload>): Promise<any> {
        const {
            request: { payload },
        } = offline;
        const { operation, uploadables, cacheConfig } = payload as any;
        const request: any = operation.request ? operation.request : operation;
        const netCacheConfig = request.cacheConfig || cacheConfig || { force: true };
        netCacheConfig.metadata = {
            ...netCacheConfig.metadata,
            offline,
        };
        return network.execute(request.node.params, request.variables, netCacheConfig, uploadables).toPromise();
    }

    public clearCache(): Promise<boolean> {
        return Promise.all([((this as any)._store as Store).purge()]).then((_result) => {
            return true;
        });
    }

    public dispose(): void {
        this.getStoreOffline().dispose();
    }

    public hydrate(): Promise<boolean> {
        if (!this.promisesRestore) {
            this.promisesRestore = Promise.all([this.getStoreOffline().hydrate(), ((this as any)._store as Store).hydrate()])
                .then((_result) => {
                    this._rehydrated = true;
                    const updateRecords = (this as any)._store.__getUpdatedRecordIDs();
                    Object.keys((this as any)._store.getSource().toJSON()).forEach((key) => {
                        updateRecords.add(key);
                    });
                    (this as any)._store.notify();
                    return true;
                })
                .catch((error) => {
                    this._rehydrated = false;
                    throw error;
                });
        }

        return this.promisesRestore;
    }

    public isRehydrated(): boolean {
        return this._rehydrated; // && this._storeOffline.getState()[NORMALIZED_REHYDRATED];
    }

    public isOnline(): boolean {
        return this.getStoreOffline().isOnline();
    }

    public getStoreOffline(): OfflineFirst<Payload> {
        return this._relayStoreOffline;
    }

    public retain(operation: OperationDescriptor, configRetain?: { ttl?: number }): Disposable {
        return (this as any)._store.retain(operation, configRetain);
    }

    public executeMutationOffline({
        operation,
        optimisticResponse,
        optimisticUpdater,
        updater,
        uploadables,
    }: {
        operation: OperationDescriptor;
        optimisticUpdater?: SelectorStoreUpdater | null;
        optimisticResponse?: { [key: string]: any } | null;
        updater?: SelectorStoreUpdater | null;
        uploadables?: UploadableMap | null;
    }): RelayObservable<GraphQLResponse> {
        let optimisticConfig;
        if (optimisticResponse || optimisticUpdater) {
            optimisticConfig = {
                operation,
                response: optimisticResponse,
                updater: optimisticUpdater,
            };
        }
        warning(
            !!optimisticConfig,
            'commitMutation offline: no optimistic responses configured. the mutation will not perform any store updates.',
        );
        const source = RelayObservable.create<any>((sink) => {
            resolveImmediate(() => {
                const sinkPublish = optimisticConfig ? (this as any).getStore().getSource()._sink.toJSON() : {};
                const backup = {};
                Object.keys(sinkPublish).forEach((key) => (backup[key] = (this as any).getStore().getSource()._base.get(key)));

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
                this.getStoreOffline()
                    .publish({ id, request, serial: true })
                    .then((_offlineRecord) => {
                        this.getStoreOffline().notify();
                        sink.complete();
                    })
                    .catch((error) => {
                        sink.error(error, true);
                    });
            });
        });
        return (this as any)._execute({
            createSource: () => source,
            isClientPayload: false,
            operation,
            optimisticConfig,
            updater: optimisticResponse ? updater : optimisticUpdater,
        });
    }

    public executeMutation(mutationOptions: {
        operation: OperationDescriptor;
        optimisticUpdater?: SelectorStoreUpdater | null;
        optimisticResponse?: { [key: string]: any } | null;
        updater?: SelectorStoreUpdater | null;
        uploadables?: UploadableMap | null;
    }): RelayObservable<GraphQLResponse> {
        if (this.isOnline()) {
            return super.executeMutation(mutationOptions);
        } else {
            return this.executeMutationOffline(mutationOptions);
        }
    }
}
