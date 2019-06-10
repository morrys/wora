import NetInfo from "./NetInfo";
import useNetInfoInternal from "./internal/useNetInfo"

export function useNetInfo(): boolean {
    return useNetInfoInternal(NetInfo)
  }
export default useNetInfo;