import { CacheStorage } from "../Cache";
import jsonSerialize from './jsonSerialize';
import prefixLayer from './prefixLayer';



type AbsStorageOptions = {
    serialize?: boolean,
    prefix?: string,
    layers?: Array<Layer<any>>
}

export interface Layer<T> {
    set: (key: string, value: T) => { key: string, value: T }
    get: (key: string, value: T) => { key: string, value: T }
    remove?: (key: string) => string
    filter?: (key: string) => boolean
}



class LayerHandler {

    serialize: boolean;
    prefix: string;
    layers: Array<Layer<any>> = [];


    constructor(options: AbsStorageOptions = {}) {
        const { prefix = 'cache', serialize = true, layers = [] } = options;
        this.serialize = serialize;
        this.prefix = prefix;
        this.layers = prefix ? this.layers.concat(prefixLayer(prefix)) : this.layers
        this.layers = this.layers.concat(layers);
        this.layers = serialize ? this.layers.concat(jsonSerialize) : this.layers;

    }




}


export default LayerHandler;