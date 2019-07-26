import { Layer } from '../CacheTypes';

const jsonSerialize: Layer<any> = {
    set: (key: string, value: any) => { return { key, value: JSON.stringify(value)} },
    get: (key: string, value: any) => { return { key, value: JSON.parse(value)} }
}

export default jsonSerialize;