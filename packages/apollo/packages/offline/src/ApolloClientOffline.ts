import { ApolloClient, ObservableQuery, OperationVariables } from "apollo-client";
import { NetInfo } from '@wora/detect-network';
import ApolloStoreOffline, { publish, OfflineOptions } from './ApolloStoreOffline';
import { CacheOptions } from "@wora/cache-persist";
import OfflineFirst from "@wora/offline-first";



class OfflineApolloClient<TCacheShape> extends ApolloClient<TCacheShape>  {

  _storeOffline: OfflineFirst<any>;
  _isRehydrated:boolean = false;

  constructor(options, 
    persistOptions:CacheOptions = {},
    offlineOptions:OfflineOptions = {},) {
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

  hydrated() {
    if (this._isRehydrated) {
      return Promise.resolve(true);
    }
    return Promise.all([this._storeOffline.restore(), (this.store as any).cache.hydrated()]).then(result => {
      this._isRehydrated = true;
      return true;
    }).catch(error => {
      this._isRehydrated = false;
      throw error;
    })
  }

  getStoreOffline() {
    return this._storeOffline;
  }

  isRehydrated() {
    return this._isRehydrated;
  }

  isOnline() {
    return this._storeOffline.isOnline();
  }

  watchQuery<T = any, TVariables = OperationVariables>(options): ObservableQuery<T, TVariables> {
    const oldFetchPolicy = options.fetchPolicy;
    if (!this.isOnline()) {
      options.fetchPolicy = 'cache-only'
    }
    const result: ObservableQuery<T, TVariables> = super.watchQuery(options);
    result.options.fetchPolicy = oldFetchPolicy;
    return result;
  }

  mutate(
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