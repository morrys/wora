import { InMemoryCache, InMemoryCacheConfig } from "apollo-cache-inmemory";
import Cache, { CacheOptions } from "@wora/cache-persist";

interface PersistImpl {
    hydrated(): Promise<Cache>
}

class ApolloCache extends InMemoryCache implements PersistImpl {

    cache: Cache;

    constructor(options: InMemoryCacheConfig = {}, persistOptions:CacheOptions = {}) {
        super(options);
        const persistOptionsApollo = {
            prefix: 'apollo-cache',
            serialize: true,
            ...persistOptions,
        }
        this.cache = new Cache(persistOptionsApollo);
    }

    hydrated(): Promise<Cache> {
        return Promise.all([this.cache.restore()]).then(result => {
            (this as any).data = result[0];
            (this as any).optimisticData = result[0];
            return (this as any).data;
        })

    }

}

export default ApolloCache;