import { ILayer } from '../CacheTypes';
export const PREFIX_DELIMITER = '.';

function prefixLayer(prefix: string, delimiter: string = PREFIX_DELIMITER): ILayer {
    const prefixKey = prefix + delimiter;
    return {
        set: (key: string, value: any) => [prefixKey + key, value],
        get: (key: string, value: any) => [key.slice(prefixKey.length), value],
        remove: (key: string) => prefixKey + key,
        check: (key: string) => (key.startsWith(prefixKey) ? key.slice(prefixKey.length) : null),
    } as ILayer;
}

export default prefixLayer;
