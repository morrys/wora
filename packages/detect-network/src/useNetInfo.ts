import { NetInfo, NetInfoConfiguration } from '@wora/netinfo';
import useNetInfoInternal from './internal/useNetInfo';

export function useNetInfo(configuration?: Partial<NetInfoConfiguration>): boolean {
    return useNetInfoInternal(NetInfo, configuration);
}
export default useNetInfo;
