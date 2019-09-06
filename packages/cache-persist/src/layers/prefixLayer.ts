import { Layer, PREFIX_DELIMITER } from '../CacheTypes';

function prefixLayer(prefix: string, delimiter: string = PREFIX_DELIMITER): Layer {
    const prefixKey = prefix + delimiter;
    return {
        set: (key: string, value: any) => { return [ prefixKey + key, value ] },
        get: (key: string, value: any) => { return [ key.slice(prefixKey.length), value ] },
        remove: (key: string) => { return prefixKey + key },
        check: (key: string) => { return key.startsWith(prefixKey) }
    }
}

export default prefixLayer;