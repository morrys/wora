import { useState, useEffect } from 'react';
import { NetInfo, NetInfoState } from '@wora/netinfo';

export function useIsConnected(netinfo: typeof NetInfo): boolean {
    const [isOnline, setIsOnline] = useState<boolean>(undefined);

    useEffect((): (() => void) => {
        function changeState(state: NetInfoState): void {
            const { isConnected } = state;
            if (isConnected !== isOnline) {
                setIsOnline(isConnected);
            }
        }
        return netinfo.addEventListener(changeState);
    }, []);

    return isOnline;
}
export default useIsConnected;
