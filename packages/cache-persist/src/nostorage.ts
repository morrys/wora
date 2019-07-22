import { CacheStorage } from './Cache';
import { StorageHelperOptions } from './StorageHelper';
const promiseVoid = new Promise<void>((resolve, reject) => {
    resolve()
});
function noStorage(options: StorageHelperOptions): CacheStorage {
    return {
        getStorage: () => {},
        getName: () => "NO-" + options.prefix,
        getOptions: () => options,
        purge: () => {
            return new Promise((resolve, reject) => {
                resolve(true)
            });
        },
        restore: () => new Promise((resolve, reject) => {
            resolve({})
        }),
        replace: (data: any) => promiseVoid,
        setItem: (key: string, item: string | object) => promiseVoid,
        removeItem: (key: string) =>  promiseVoid,
    }
}

