import { InMemoryCache, InMemoryCacheConfig } from 'apollo-cache-inmemory';
import Cache, { ICache, CacheOptions } from '@wora/cache-persist';

interface IPersistImpl {
    hydrate(): Promise<ICache>;
}

class ApolloCache extends InMemoryCache implements IPersistImpl {
    public cache: Cache;

    constructor(options: InMemoryCacheConfig = {}, persistOptions: CacheOptions = {}) {
        super(options);
        const persistOptionsApollo = {
            prefix: 'apollo-cache',
            serialize: true,
            ...persistOptions,
        };
        this.cache = new Cache(persistOptionsApollo);
        (this.cache as any).toObject = (): Readonly<{
            [key: string]: any;
        }> => this.cache.getState();
        (this.cache as any).clear = (): void => this.cache.purge();
        (this as any).data = this.cache;
        (this as any).optimisticData = this.cache;
    }

    public hydrate(): Promise<ICache> {
        return this.cache.restore();
    }
}

export default ApolloCache;
