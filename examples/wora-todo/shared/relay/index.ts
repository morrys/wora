import { RecordSource, Store, Environment, Network } from 'relay-runtime';

export { QueryRenderer, graphql } from 'react-relay';
import RelayNetworkLogger from 'relay-runtime/lib/RelayNetworkLogger'

/**
 * Define fetch query
 */
const fetchQuery = async (operation: any, variables: any) => {
  const localIp = "192.168.1.105";
  const response = await  fetch('http://'+localIp+':3000/graphql', {
    body: JSON.stringify({
      query: operation.text,
      variables,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });
  return response.json();
}



/**
 * Network
 */
const network = Network.create(RelayNetworkLogger.wrapFetch(fetchQuery, () => ''));
export default network;

const recordSource = new RecordSource();
/**
 * Store
 */
export const store = new Store(recordSource);

/**
 * Environment 
 */
export const environment = new Environment({ network, store });