import NetInfo from './NetInfo';

import useIsConnectedInternal from '../internal/useIsConnected';

export function useIsConnected(): boolean {
    return useIsConnectedInternal(NetInfo);
}
export default useIsConnected;
