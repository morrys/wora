import { ICacheStorage, CacheOptions } from '@wora/cache-persist';
import IDBStorage, { IOnUpgrade } from '@wora/cache-persist/lib/idbstorage';
import { EnvironmentConfig } from 'relay-runtime/lib/RelayModernEnvironment';
import { Store, RecordSource } from '@wora/relay-store';
import { Scheduler, OperationLoader } from 'relay-runtime/lib/RelayStoreTypes';
import RelayModernEnvironment from './RelayModernEnvironment';
import { OfflineOptions, Payload } from './OfflineFirstRelay';
import { CacheOptionsStore } from '@wora/relay-store/lib/Store';

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
type EnvironmentOfflineConfig = Omit<EnvironmentConfig, 'store'>; // Equivalent to: {b: number, c: boolean}

class EnvironmentIDB {
    public static create(
        config: EnvironmentOfflineConfig,
        offlineOptions: OfflineOptions<Payload>,
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
            ttl?: number;
            onUpgrade?: IOnUpgrade;
            version?: number;
        } = {},
        offlineStoreOptions: CacheOptions = {},
    ): RelayModernEnvironment {
        let idbStore: CacheOptions;
        let idbRecords: CacheOptions;
        let idbOffline: CacheOptions;
        const { gcScheduler, operationLoader, persistOptions } = storeOptions;
        if (typeof window !== 'undefined') {
            const { name = 'relay', onUpgrade, version } = idbOptions;
            const idbStorages: ICacheStorage[] = IDBStorage.create({
                name,
                storeNames: ['store', 'records', 'offline'],
                onUpgrade,
                version,
            });

            idbStore = {
                storage: idbStorages[0],
                serialize: false,
                prefix: null,
                ...persistOptions,
            };

            idbRecords = {
                storage: idbStorages[1],
                serialize: false,
                prefix: null,
                ...recordSourceOptions,
            };

            idbOffline = {
                storage: idbStorages[2],
                serialize: false,
                prefix: null,
                ...offlineStoreOptions,
            };
        }
        const recordSource = new RecordSource(idbRecords);
        const store = new Store(recordSource, idbStore, idbRecords, gcScheduler, operationLoader);
        return new RelayModernEnvironment({ ...config, store }, offlineOptions, idbOffline);
    }
}

export default EnvironmentIDB;
