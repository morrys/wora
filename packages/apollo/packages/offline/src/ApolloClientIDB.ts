import { CacheStorage, CacheOptions } from "@wora/cache-persist";
import IDBStorage from '@wora/cache-persist/lib/idbstorage';
import ApolloClientOffline, { OfflineApolloClientOptions } from "./ApolloClientOffline";
import { OfflineOptions } from "./ApolloStoreOffline";
import { InMemoryCacheConfig } from "apollo-cache-inmemory";
import ApolloCache from '@wora/apollo-cache'

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
type ApolloClientIDBOptions = Omit<OfflineApolloClientOptions, "cache">; // Equivalent to: {b: number, c: boolean}


class ApolloClientIDB {

    public static create(config: ApolloClientIDBOptions, 
        cacheOptions: InMemoryCacheConfig = {},
        offlineOptions:OfflineOptions = {},
        persistOptions:CacheOptions = {},): ApolloClientOffline {

        let idbStore: CacheOptions;  
        let idbOffline: CacheOptions;   
        const serialize: boolean = persistOptions.serialize; 
        const prefix: string = persistOptions.prefix; 
        if (typeof window !== 'undefined') {
            const idbStorages: CacheStorage[] = IDBStorage.create(prefix || "apollo", ["store", "offline" ]);

            idbStore = {
                storage: idbStorages[0],
                serialize: serialize || false,
            }

            idbOffline = {
                storage: idbStorages[1],
                serialize: serialize || false,
            }
        }

        const cache = new ApolloCache(cacheOptions, idbStore)
        return new ApolloClientOffline({...config, cache}, offlineOptions, idbOffline);
    }
}

export default ApolloClientIDB;