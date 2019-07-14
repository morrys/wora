import { NetInfo } from "@wora/netinfo";
import useIsConnectedInternal from "./internal/useIsConnected"

export function useIsConnected(): boolean {
    return useIsConnectedInternal(NetInfo)
  }
export default useIsConnected;