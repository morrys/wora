import { IStorageHelper } from './CacheTypes';
import { promiseVoid, promiseResult } from './StorageProxy';
function NoStorageProxy() {
    return {
        restore: () => {
            return promiseResult(() => {
                return {};
            });
        },
        push: (_keys: string) => undefined,
        flush: () => promiseVoid(),
    } as IStorageHelper;
}

export default NoStorageProxy;
