import { InMemoryCache, InMemoryCacheConfig } from '@apollo/client/cache/inmemory/inMemoryCache';
import { ICache, CacheOptions } from '@wora/cache-persist';
import EntityRoot from './EntityCache';

interface IPersistImpl {
    hydrate(): Promise<ICache>;
}

export class ApolloCache extends InMemoryCache implements IPersistImpl {
    public cache: EntityRoot;

    constructor(options: InMemoryCacheConfig = {}, persistOptions: CacheOptions = {}) {
        super(options);
        this.cache = new EntityRoot({
            resultCaching: this.config.resultCaching,
            persistOptions,
        });
        (this as any).data = this.cache;
        (this as any).optimisticData = this.cache;
    }

    public hydrate(): Promise<ICache> {
        return this.cache.hydrate();
    }
}

export default ApolloCache;
