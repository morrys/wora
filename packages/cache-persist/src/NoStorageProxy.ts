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

    setItem(key: string, value: any, promise: true): Promise<void>;
    setItem(key: string, value: any): void;
    setItem(key: any, value: any, promise?: any) {
        if (promise) {
            return promiseVoid();
        }
    }

    removeItem(key: string, promise: true): Promise<void>;
    removeItem(key: string): void;
    removeItem(key: any, promise?: any) {
        if (promise) {
            return promiseVoid();
        }
    }
}

export default NoStorageProxy;
