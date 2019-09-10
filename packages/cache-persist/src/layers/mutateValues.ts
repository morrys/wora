import { ILayer } from '../CacheTypes';

function mutateValues(mutateSet: (value: any) => any, mutateGet: (value: any) => any): ILayer {
    return {
        set: (key: string, value: any) => [key, mutateSet(value)],
        get: (key: string, value: any) => [key, mutateGet(value)],
    } as ILayer;
}

export default mutateValues;
