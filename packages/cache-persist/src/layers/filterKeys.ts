import { IMutateKey } from '../CacheTypes';
import mutateKeys from './mutateKeys';

function filterKeys(filter: (key: string) => boolean): IMutateKey {
    return mutateKeys((key) => (filter(key) ? key : null), (key) => (filter(key) ? key : null));
}

export default filterKeys;
