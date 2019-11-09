/* eslint-disable */
import { useState, useRef } from 'react';
import { DocumentNode } from 'graphql';
import { OperationVariables, QueryResult } from '@apollo/react-common';
import { useQuery as useQueryApollo, useApolloClient, QueryHookOptions } from '@apollo/react-hooks';

const useQuery = function<TData = any, TVariables = OperationVariables>(
    query: DocumentNode,
    options?: QueryHookOptions<TData, TVariables>,
): QueryResult<TData, TVariables> {
    const client: any = useApolloClient();
    const [, forceUpdate] = useState(null);
    const ref = useRef<{ hydrate: boolean; data: any }>({
        hydrate: client.isRehydrated(),
        data: null,
    });

    if (!ref.current.hydrate) {
        ref.current.hydrate = true;
        client.hydrate().then(() => {
            const { data } = ref.current;
            if (!data) forceUpdate(client);
        });
    }

    const { data, ...others } = useQueryApollo(query, options);
    ref.current.data = data;

    return {
        ...others,
        data,
    };
};

export default useQuery;
