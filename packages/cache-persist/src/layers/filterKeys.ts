import { ILayer } from '../CacheTypes';

function filterKeys(filter: (key: string) => boolean): ILayer {
    return {
        set: (key: string, value: any) => (filter(key) ? [key, value] : null),
        get: (key: string, value: any) => [key, value], // filtered in check
        remove: (key: string) => (filter(key) ? key : null),
        check: (key: string) => filter(key),
    } as ILayer;
}

export default filterKeys;
