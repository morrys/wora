import { Layer } from '../CacheTypes';

const jsonSerialize: Layer = {
    set: (key: string, value: any) => { return [ key, JSON.stringify(value) ] },
    get: (key: string, value: any) => { return [ key, JSON.parse(value) ] }
}

export default jsonSerialize;