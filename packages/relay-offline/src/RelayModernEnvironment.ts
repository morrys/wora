import { Environment, Observable as RelayObservable, GraphQLResponse } from 'relay-runtime';

import { EnvironmentConfig } from 'relay-runtime/lib/store/RelayModernEnvironment';

import { Store } from '@wora/relay-store';
import { CacheOptions } from '@wora/cache-persist';
import ExecutionEnvironment from 'fbjs/lib/ExecutionEnvironment';

import { NormalizationSelector, Disposable } from 'relay-runtime';

import StoreOffline, { OfflineOptions, Payload, IRelayStoreOffline } from './OfflineFirstRelay';
import OfflineFirst from '@wora/offline-first';

class RelayModernEnvironment extends Environment {
    private _rehydrated = !ExecutionEnvironment.canUseDOM;
    private _relayStoreOffline: IRelayStoreOffline;
    private promisesRestore;

    constructor(config: EnvironmentConfig, persistOfflineOptions: CacheOptions = {}) {
        super(config);
        this._relayStoreOffline = StoreOffline.create(persistOfflineOptions);
        this.setOfflineOptions();
        if (this._rehydrated) {
            this.promisesRestore = Promise.resolve(true);
        }
        (this as any)._store.setCheckGC(() => this.isOnline()); // todo refactor use listener & holdgc
    }

    public clearCache(): Promise<boolean> {
        return Promise.all([((this as any)._store as Store).purge()]).then((_result) => {
            return true;
        });
    }

    public setOfflineOptions(offlineOptions?: OfflineOptions<Payload>): void {
        this._relayStoreOffline.setOfflineOptions(this, offlineOptions);
    }

    public hydrate(): Promise<boolean> {
        if (!this.promisesRestore) {
            this.promisesRestore = Promise.all([this.getStoreOffline().hydrate(), ((this as any)._store as Store).hydrate()])
                .then((_result) => {
                    this._rehydrated = true;
                    const updateRecords = (this as any)._store.__getUpdatedRecordIDs();
                    Object.keys((this as any)._store.getSource().toJSON()).forEach((key) => (updateRecords[key] = true));
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
        return this._relayStoreOffline.storeOffline;
    }

    public retain(selector: NormalizationSelector, configRetain): Disposable {
        return (this as any)._store.retain(selector, configRetain);
    }

    public executeMutationOffline({
        operation,
        optimisticResponse,
        optimisticUpdater,
        updater,
        uploadables,
    }): RelayObservable<GraphQLResponse> {
        return super.executeMutation({
            operation,
            optimisticResponse,
            optimisticUpdater,
            updater,
            uploadables,
        });
    }

    public executeMutation(mutationOptions): RelayObservable<GraphQLResponse> {
        if (this.isOnline()) {
            return super.executeMutation(mutationOptions);
        } else {
            return RelayObservable.create((sink) => {
                this._relayStoreOffline.publish(this, mutationOptions).subscribe({
                    complete: () => sink.complete(),
                    error: (error) => sink.error(error),
                    next: (response) => sink.next(response),
                });
                return (): any => {};
            });
        }
    }
}

export default RelayModernEnvironment;
