import { IStorageHelper, DataCache } from './CacheTypes';
import { promiseVoid, promiseResult } from './StorageProxy';

class NoStorageProxy implements IStorageHelper {
    public restore(): Promise<DataCache> {
        return promiseResult(() => {
            return {};
        });
    }

    public multiPush(keys: Array<string>) {}

    public push(key: string) {}

    public flush(): Promise<void> {
        return promiseVoid();
    }
}

export default NoStorageProxy;
