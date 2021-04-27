/* eslint-disable @typescript-eslint/camelcase */
import { fetchQuery_DEPRECATED as relayFetchQuery, GraphQLTaggedNode, CacheConfig, OperationType } from 'relay-runtime';
import { Environment } from './Environment';

export function fetchQuery_DEPRECATED<T extends OperationType>(
    environment: Environment,
    taggedNode: GraphQLTaggedNode,
    variables: T['variables'],
    cacheConfig?: CacheConfig | null,
): Promise<T['response']> {
    if (!environment.isRehydrated()) {
        return environment.hydrate().then(() => {
            return relayFetchQuery(environment, taggedNode, variables, cacheConfig);
        });
    }
    return relayFetchQuery(environment, taggedNode, variables, cacheConfig);
}
