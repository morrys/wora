import { IMutateKey } from '../CacheTypes';
import mutateKeys from './mutateKeys';
export const PREFIX_DELIMITER = '.';

function prefixLayer(prefix: string, delimiter: string = PREFIX_DELIMITER): IMutateKey {
    const prefixKey = prefix + delimiter;
    return mutateKeys(
        (key) => prefixKey + key,
        (key: string) => (key.startsWith(prefixKey) ? key.slice(prefixKey.length) : null),
    ) as IMutateKey;
}

export default prefixLayer;
