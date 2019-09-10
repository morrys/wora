import { NetInfo } from '@wora/netinfo';
import useNetInfoInternal from './internal/useNetInfo';

export function useNetInfo(): boolean {
    return useNetInfoInternal(NetInfo);
}
export default useNetInfo;
