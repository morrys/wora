import { Layer } from '../CacheTypes';

function mutateValues(mutateSet: (value: any) => any, mutateGet: (value: any) => any ): Layer {
    return {
        set: (key: string, value: any) => {  return [ key, mutateSet(value) ]; },
        get: (key: string, value: any) => { return [ key, mutateGet(value) ] }, 
    }
}

export default mutateValues;