import { Layer } from '../StorageProxy';

function prefixLayer(prefix: string): Layer<any> {
    const prefixKey = prefix + ".";
    return {
        set: (key: string, value: any) => { return { key: prefixKey + key, value } },
        get: (key: string, value: any) => { return { key: key.slice(prefixKey.length), value } },
        remove: (key: string) => { return prefixKey + key },
        filter: (key: string) => { return key.startsWith(prefixKey) }
    }
}

export default prefixLayer;