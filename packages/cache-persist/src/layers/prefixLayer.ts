import { Layer } from '../StorageHelper';

function prefixLayer(prefix: string): Layer<any> {
    return {
        set: (key: string, value: any) => { return { key: prefix + key, value } },
        get: (key: string, value: any) => { return { key: key.slice(prefix.length), value } },
        remove: (key: string) => { return prefix + key },
        filter: (key: string) => { return key.startsWith(prefix) }
    }
}

export default prefixLayer;