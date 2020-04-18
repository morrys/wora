/* eslint import/no-extraneous-dependencies:0 */
import { NetInfo } from '@wora/netinfo';

import { useIsConnected as useIsConnectedInternal } from './internal/useIsConnected';

export function useIsConnected(): boolean {
    return useIsConnectedInternal(NetInfo);
}
