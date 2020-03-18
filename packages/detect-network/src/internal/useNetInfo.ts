import { useState, useEffect } from 'react';

export function useNetInfo(NetInfo): any {
    const [netInfo, setNetInfo] = useState<any>({
        type: 'unknown',
        isConnected: false,
        details: null,
    });

    useEffect((): (() => void) => {
        const dispose = NetInfo.addEventListener('connectionChange', setNetInfo);
        return (): any => dispose.remove();
    }, []);

    return netInfo;
}

export default useNetInfo;
