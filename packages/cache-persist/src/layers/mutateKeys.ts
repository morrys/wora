import { ILayer } from '../CacheTypes';

function mutateKeys(mutateSet: (key: string) => string, mutateGet: (key: string) => string, checkKey: (key: string) => boolean): ILayer {
    return {
        set: (key: string, value: any) => [mutateSet(key), value],
        get: (key: string, value: any) => {
            return [mutateGet(key), value];
        },
        remove: (key: string) => mutateSet(key),
        check: (key: string) => {
            return checkKey(key) ? mutateGet(key) : null;
        },
    } as ILayer;
}

export default mutateKeys;
