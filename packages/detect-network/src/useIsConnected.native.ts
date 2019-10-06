/* eslint import/no-extraneous-dependencies:0 */
import NetInfo from '@react-native-community/netinfo';

import useIsConnectedInternal from './internal/useIsConnected';

export function useIsConnected(): boolean {
    return useIsConnectedInternal(NetInfo);
}
export default useIsConnected;
