import { ApolloClient, ObservableQuery, OperationVariables, ApolloClientOptions } from 'apollo-client';
import ApolloStoreOffline, { IApolloStoreOffline, OfflineOptions, Payload } from './ApolloStoreOffline';
import { CacheOptions } from '@wora/cache-persist';
import OfflineFirst from '@wora/offline-first';
import ApolloStore from '@wora/apollo-cache';
import { NormalizedCacheObject } from 'apollo-cache-inmemory';

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type OfflineApolloClientOptions = Omit<ApolloClientOptions<NormalizedCacheObject>, 'cache'> & {
    cache: ApolloStore;
};

class OfflineApolloClient extends ApolloClient<NormalizedCacheObject> {
    private apolloStoreOffline: IApolloStoreOffline;
    private rehydrated = false;

    constructor(apolloOptions: OfflineApolloClientOptions, persistOptions: CacheOptions = {}) {
        super(apolloOptions);
        (this.queryManager as any).isOnline = true;
        this.apolloStoreOffline = ApolloStoreOffline.create(persistOptions);
        this.setOfflineOptions();
        this.getStoreOffline().addNetInfoListener((isConnected: boolean) => {
            (this.queryManager as any).isOnline = isConnected;
        });

        const originalFetchQuery = this.queryManager.fetchQuery;
        this.queryManager.fetchQuery = function(queryId, options, fetchType, fetchMoreForQueryId): any {
            const oldFetchPolicy = options.fetchPolicy;
            if (!this.isOnline) {
                options.fetchPolicy = 'cache-only';
            }
            const result = originalFetchQuery.apply(this, [queryId, options, fetchType, fetchMoreForQueryId]);
            options.fetchPolicy = oldFetchPolicy;
            return result;
        };
    }

    public setOfflineOptions(offlineOptions?: OfflineOptions<Payload>) {
        this.apolloStoreOffline.setOfflineOptions(this, offlineOptions);
    }

    public hydrate(): Promise<boolean> {
        if (this.rehydrated) {
            return Promise.resolve(true);
        }
        return Promise.all([this.getStoreOffline().hydrate(), (this.cache as ApolloStore).hydrate()])
            .then((_result) => {
                this.rehydrated = true;
                return true;
            })
            .catch((error) => {
                this.rehydrated = false;
                throw error;
            });
    }

    public getStoreOffline(): OfflineFirst<any> {
        return this.apolloStoreOffline.storeOffline;
    }

    public isRehydrated(): boolean {
        return this.rehydrated;
    }

    public isOnline(): boolean {
        return this.getStoreOffline().isOnline();
    }

    public watchQuery<T = any, TVariables = OperationVariables>(options: any): ObservableQuery<T, TVariables> {
        const oldFetchPolicy = options.fetchPolicy;
        if (!this.isOnline()) {
            options.fetchPolicy = 'cache-only';
        }
        const result: ObservableQuery<T, TVariables> = super.watchQuery(options);
        result.options.fetchPolicy = oldFetchPolicy;
        return result;
    }

    public mutate(options: any): any {
        if (!this.isOnline()) {
            return this.apolloStoreOffline.publish(this, options);
        }
        return super.mutate(options);
    }
}

/*
const client = new OfflineApolloClient({
  link: httpLink,
  cache: new ApolloCache({
    dataIdFromObject: o => o.id
  })
});
*/

export default OfflineApolloClient;
