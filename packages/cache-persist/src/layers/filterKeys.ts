import { Layer } from '../CacheTypes';

function filterKeys(filter: (key: string) => boolean ): Layer {
    return {
        set: (key: string, value: any) => { 
            return filter(key) ? [ key, value ] : null;
        },
        get: (key: string, value: any) => { return filter(key) ? [ key, value ] : null; },
        remove: (key: string) => { return filter(key) ? key : null; },
        check: (key: string) => { return  filter(key) }
    }
}

export default filterKeys;