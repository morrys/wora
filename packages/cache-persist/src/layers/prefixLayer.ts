import { ILayer } from '../CacheTypes';
import mutateKeys from './mutateKeys';
export const PREFIX_DELIMITER = '.';

function prefixLayer(prefix: string, delimiter: string = PREFIX_DELIMITER): ILayer {
    const prefixKey = prefix + delimiter;
    return mutateKeys((key) => prefixKey + key, (key) => key.slice(prefixKey.length), (key) => key.startsWith(prefixKey));
}

export default prefixLayer;
