import { NetInfo } from '@wora/netinfo';
import { useIsConnected as useIsConnectedInternal } from './internal/useIsConnected';

export function useIsConnected(): boolean {
    return useIsConnectedInternal(NetInfo);
}
