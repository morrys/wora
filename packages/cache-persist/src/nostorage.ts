import { Storage } from './Cache';
import { promiseVoid, promiseResult, ItemCache } from './StorageProxy';
function noStorage(): Storage {
    return {
        multiRemove: (keys: Array<string>) => promiseVoid(() => {} ),
        multiGet: (keys: Array<string>) => promiseResult(() => {
            return {};
        }),
        getAllKeys: (): Promise<Array<string>> => promiseResult<Array<string>>(() => {
            return []
        }),
        multiSet: (items: Array<ItemCache<any>>) => promiseVoid(() => {} ),
        setItem: (key: string, value: string): Promise<void> => promiseVoid(() => {} ),
        removeItem: (key: string): Promise<void> => promiseVoid(() => {} ),
    }
}

export default noStorage;
