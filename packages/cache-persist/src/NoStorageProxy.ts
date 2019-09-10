import { IStorageHelper, DataCache } from './CacheTypes';
import { promiseVoid, promiseResult } from './StorageProxy';

class NoStorageProxy implements IStorageHelper {
    public purge(): Promise<boolean> {
        return promiseResult(() => true);
    }

    public restore(): Promise<DataCache> {
        return promiseResult(() => {
            return {};
        });
    }

    public replace(_data: any): Promise<void> {
        return promiseVoid();
    }

    public setItem(_key: string, _item: string | object): Promise<void> {
        return promiseVoid();
    }

    public removeItem(_key: string): Promise<void> {
        return promiseVoid();
    }
}

export default NoStorageProxy;
