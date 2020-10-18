import { InMemoryCacheConfig } from '@apollo/client/cache/inmemory/inMemoryCache';
import { ApolloClientIDBOptions } from './ApolloOfflineTypes';
import { ICacheStorage, CacheOptions } from '@wora/cache-persist';
import { IDBStorage, IOnUpgrade } from '@wora/cache-persist/lib/idbstorage';
import { ApolloClientOffline } from './ApolloClientOffline';
import { ApolloCache } from '@wora/apollo-cache';

export class ApolloClientIDB {
    public static create(
        config: ApolloClientIDBOptions,
        options: {
            cacheOptions?: InMemoryCacheConfig;
            persistOptions?: CacheOptions;
            offlineStoreOptions?: CacheOptions;
            idbOptions?: {
                name?: string;
                onUpgrade?: IOnUpgrade;
                version?: number;
            };
        } = {},
    ): ApolloClientOffline {
        const { cacheOptions, persistOptions = {}, offlineStoreOptions = {}, idbOptions = {} } = options;
        const idbStore: CacheOptions = {
            serialize: false,
            prefix: null,
            ...persistOptions,
        };
        const idbOffline: CacheOptions = {
            serialize: false,
            prefix: null,
            ...offlineStoreOptions,
        };
        if (typeof window !== 'undefined') {
            const { name = 'apollo', onUpgrade, version } = idbOptions;
            const idbStorages: Array<ICacheStorage> = IDBStorage.create({
                name,
                storeNames: ['store', 'offline'],
                onUpgrade,
                version,
            });

            idbStore.storage = idbStorages[0];
            idbOffline.storage = idbStorages[1];
        }

        const cache = new ApolloCache(cacheOptions, idbStore);
        return new ApolloClientOffline({ ...config, cache }, idbOffline);
    }
}

export default ApolloClientIDB;
