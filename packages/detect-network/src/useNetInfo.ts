import { useState, useEffect } from 'react';
import { NetInfo, NetInfoState, NetInfoConfiguration } from '@wora/netinfo';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useNetInfo(configuration?: Partial<NetInfoConfiguration>): any {
    const [netInfo, setNetInfo] = useState<NetInfoState>({
        type: 'unknown',
        isInternetReachable: false,
        isConnected: false,
        details: null,
    });

    useEffect((): (() => void) => {
        NetInfo.fetch().then(setNetInfo);
        return NetInfo.addEventListener(setNetInfo);
    }, []);

    return netInfo;
}
