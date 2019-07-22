import jsonSerialize from './layers/jsonSerialize';
import prefixLayer from './layers/prefixLayer';



export type StorageHelperOptions = {
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



class StorageHelper {
    

    serialize: boolean;
    prefix: string;
    layers: Array<Layer<any>> = [];


    constructor(options: StorageHelperOptions = {}) {
        const { prefix = 'cache', serialize = true, layers = [] } = options;
        this.serialize = serialize;
        this.prefix = prefix;
        this.layers = prefix ? this.layers.concat(prefixLayer(prefix)) : this.layers
        this.layers = this.layers.concat(layers);
        this.layers = serialize ? this.layers.concat(jsonSerialize) : this.layers;
    }

    public getPrefix():string {
        return this.prefix;
    }

    public filter(key: string) {
        return true;
    }

    set(key: string, value: any) {
        return { key, value }
    }
    get(key: string, value: any) {
        return { key, value }
    }
    remove(key: string): any {
        return key;
    }



}


export default StorageHelper;