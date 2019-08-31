import { CacheStorage, DataCache } from './CacheTypes';
import { promiseVoid, promiseResult } from './StorageProxy';

class NoStorageProxy implements CacheStorage {
    purge():  Promise<boolean> { return promiseResult(() => { return true } )}   
    restore(): Promise<DataCache> { return promiseResult(() => { return {} } )}   
    replace(data: any): Promise<void> { return promiseVoid(() => { } ) }   
    setItem(key: string, item: string | object): Promise<void> { return promiseVoid(() => { } ) }   
    removeItem(key: string): Promise<void> { return promiseVoid(() => { } ) }   
}

export default NoStorageProxy;