import { Layer } from '../CacheTypes';
import { PREFIX_DELIMITER } from '../Cache';

function prefixLayer(prefix: string): Layer {
    const prefixKey = prefix + PREFIX_DELIMITER;
    return {
        set: (key: string, value: any) => { return [ prefixKey + key, value ] },
        get: (key: string, value: any) => { return [ key.slice(prefixKey.length), value ] },
        remove: (key: string) => { return prefixKey + key },
        check: (key: string) => { return key.startsWith(prefixKey) }
    }
}

export default prefixLayer;