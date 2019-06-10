import { useState, useEffect } from 'react';

export function useIsConnected(NetInfo): boolean {
    const [isConnected, setIsConnected] = useState<boolean>(undefined);

    function changeState(nextIsConnected) {
        if(isConnected!==nextIsConnected) {
            setIsConnected(nextIsConnected)
        }
    }
  
    useEffect((): (() => void) => {
      const dispose = NetInfo.isConnected.addEventListener('connectionChange', changeState);
      return () => dispose.remove();
    }, []);
  
    return isConnected;
  }
export default useIsConnected;