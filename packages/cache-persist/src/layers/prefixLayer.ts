import { Layer } from '../CacheTypes';
import { PREFIX_DELIMITER } from '../Cache';

function prefixLayer(prefix: string): Layer<any> {
    const prefixKey = prefix + PREFIX_DELIMITER;
    return {
        set: (key: string, value: any) => { return { key: prefixKey + key, value } },
        get: (key: string, value: any) => { return { key: key.slice(prefixKey.length), value } },
        remove: (key: string) => { return prefixKey + key },
        check: (key: string) => { return key.startsWith(prefixKey) }
    }
}

export default prefixLayer;