import { Environment, Observable as RelayObservable, GraphQLResponse } from 'relay-runtime';

import { EnvironmentConfig } from 'relay-runtime/lib/RelayModernEnvironment';

import { Store } from '@wora/relay-store';
import { CacheOptions } from '@wora/cache-persist';

import { NormalizationSelector, Disposable } from 'relay-runtime/lib/RelayStoreTypes';

import StoreOffline, { OfflineOptions, Payload, publish } from './OfflineFirstRelay';
import OfflineFirst from '@wora/offline-first';

class RelayModernEnvironment extends Environment {
    private _isRestored: boolean;
    private _storeOffline: OfflineFirst<Payload>;

    constructor(config: EnvironmentConfig, offlineOptions: OfflineOptions<Payload>, persistOfflineOptions: CacheOptions = {}) {
        super(config);
        this._storeOffline = StoreOffline.create(this, persistOfflineOptions, offlineOptions);
        (this as any)._store.setCheckGC(() => this.isOnline());
    }

    public clearCache(): Promise<boolean> {
        return Promise.all([((this as any)._store as Store).purge()]).then((_result) => {
            return true;
        });
    }

    public restore(): Promise<boolean> {
        if (this._isRestored) {
            return Promise.resolve(true);
        }
        return Promise.all([this._storeOffline.restore(), ((this as any)._store as Store).restore()])
            .then((_result) => {
                this._isRestored = true;
                const updateRecords = (this as any)._store.__getUpdatedRecordIDs();
                Object.keys((this as any)._store.getSource().toJSON()).forEach((key) => (updateRecords[key] = true));
                (this as any)._store.notify();
                return true;
            })
            .catch((error) => {
                this._isRestored = false;
                throw error;
            });
    }

    public isRestored(): boolean {
        return this._isRestored;
    }

    public isRehydrated(): boolean {
        return this._isRestored; // && this._storeOffline.getState()[NORMALIZED_REHYDRATED];
    }

    public isOnline(): boolean {
        return this._storeOffline.isOnline();
    }

    public getStoreOffline(): OfflineFirst<Payload> {
        return this._storeOffline;
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
                publish(this, mutationOptions).subscribe({
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
