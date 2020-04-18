import { ICacheStorage, CacheOptions } from '@wora/cache-persist';
import { IDBStorage, IOnUpgrade } from '@wora/cache-persist/lib/idbstorage';
import { Store, RecordSource } from '@wora/relay-store';
import { Scheduler, OperationLoader } from 'relay-runtime/lib/store/RelayStoreTypes';
import { Environment } from './Environment';
import { CacheOptionsStore } from '@wora/relay-store/lib/Store';
import { EnvironmentOfflineConfig } from './RelayOfflineTypes';

class EnvironmentIDB {
    public static create(
        config: EnvironmentOfflineConfig,
        idbOptions: {
            name?: string;
            onUpgrade?: IOnUpgrade;
            version?: number;
        } = {},
        recordSourceOptions: CacheOptions = {},
        storeOptions: {
            persistOptions?: CacheOptionsStore;
            gcScheduler?: Scheduler;
            operationLoader?: OperationLoader;
            getDataID?: any; // do not use
        } = {},
        offlineStoreOptions: CacheOptions = {},
    ): Environment {
        const { gcScheduler, operationLoader, getDataID, persistOptions } = storeOptions;
        const idbStore: CacheOptions = {
            serialize: false,
            prefix: null,
            ...persistOptions,
        };
        const idbRecords: CacheOptions = {
            serialize: false,
            prefix: null,
            ...recordSourceOptions,
        };
        const idbOffline: CacheOptions = {
            serialize: false,
            prefix: null,
            ...offlineStoreOptions,
        };
        if (typeof window !== 'undefined') {
            const { name = 'relay', onUpgrade, version } = idbOptions;
            const idbStorages: ICacheStorage[] = IDBStorage.create({
                name,
                storeNames: ['store', 'records', 'offline'],
                onUpgrade,
                version,
            });

            idbStore.storage = idbStorages[0];
            idbRecords.storage = idbStorages[1];
            idbOffline.storage = idbStorages[2];
        }
        const recordSource = new RecordSource(idbRecords);
        const store = new Store(recordSource, idbStore, gcScheduler, operationLoader, getDataID);
        return new Environment({ ...config, store }, idbOffline);
    }
}

export default EnvironmentIDB;
