import { fetchQuery as relayFetchQuery, GraphQLTaggedNode, CacheConfig } from 'relay-runtime';
import { OperationType } from 'relay-runtime';
import { Environment } from './Environment';

export function fetchQuery<T extends OperationType>(
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
