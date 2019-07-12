import { ApolloClient, ObservableQuery, OperationVariables, ApolloClientOptions } from "apollo-client";
import { NetInfo } from '@wora/detect-network';
import ApolloStoreOffline, { publish, OfflineOptions } from './ApolloStoreOffline';
import { CacheOptions } from "@wora/cache-persist";
import OfflineFirst from "@wora/offline-first";
import ApolloStore from "@wora/apollo-cache";
import { NormalizedCacheObject } from "apollo-cache-inmemory";

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
export type OfflineApolloClientOptions = Omit<ApolloClientOptions<NormalizedCacheObject>, "cache"> & {
    cache: ApolloStore
};




class OfflineApolloClient extends ApolloClient<NormalizedCacheObject>  {

  _storeOffline: OfflineFirst<any>;
  _isRehydrated:boolean = false;

  constructor(options: OfflineApolloClientOptions, 
    offlineOptions:OfflineOptions = {},
    persistOptions:CacheOptions = {},
    ) {
    super(options);
    (this.queryManager as any).isOnline = true;
    this._storeOffline = ApolloStoreOffline.create(this, persistOptions, offlineOptions);
    NetInfo.isConnected.addEventListener('connectionChange', isConnected => {
      (this.queryManager as any).isOnline = isConnected;

    });

    const originalFetchQuery = this.queryManager.fetchQuery;
    this.queryManager.fetchQuery = function (queryId, options, fetchType, fetchMoreForQueryId) {
      const oldFetchPolicy = options.fetchPolicy;
      if (!this.isOnline) {
        options.fetchPolicy = 'cache-only'
      }
      const result = originalFetchQuery.apply(this, [queryId, options, fetchType, fetchMoreForQueryId]);
      options.fetchPolicy = oldFetchPolicy;
      return result;
    }
  }

  public hydrated(): Promise<boolean> {
    if (this._isRehydrated) {
      return Promise.resolve(true);
    }
    return Promise.all([this._storeOffline.restore(), (this.cache as ApolloStore).hydrated()]).then(result => {
      this._isRehydrated = true;
      return true;
    }).catch(error => {
      this._isRehydrated = false;
      throw error;
    })
  }

  public getStoreOffline() {
    return this._storeOffline;
  }

  public isRehydrated() {
    return this._isRehydrated;
  }

  public isOnline() {
    return this._storeOffline.isOnline();
  }

  public watchQuery<T = any, TVariables = OperationVariables>(options): ObservableQuery<T, TVariables> {
    const oldFetchPolicy = options.fetchPolicy;
    if (!this.isOnline()) {
      options.fetchPolicy = 'cache-only'
    }
    const result: ObservableQuery<T, TVariables> = super.watchQuery(options);
    result.options.fetchPolicy = oldFetchPolicy;
    return result;
  }

  public mutate(
    options,
  ) {
    if (!this.isOnline()) {
      return publish(this, options);

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