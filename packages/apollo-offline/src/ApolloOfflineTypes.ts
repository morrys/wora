import { ApolloLink, NormalizedCacheObject, ApolloClientOptions } from '@apollo/client';
import { OfflineFirstOptions } from '@wora/offline-first';
import ApolloStore from '@wora/apollo-cache';

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type OfflineApolloClientOptions = Omit<ApolloClientOptions<NormalizedCacheObject>, 'cache'> & {
    cache: ApolloStore;
};

export type ApolloClientIDBOptions = Omit<OfflineApolloClientOptions, 'cache'>;

export type OfflineOptions<T> = Omit<OfflineFirstOptions<T>, 'execute'> & {
    link?: ApolloLink;
};

export type Payload = {
    mutation: any;
    variables?: any;
    context?: any;
    optimisticResponse?: any;
};
