import { ILayer } from '../CacheTypes';
import mutateKeys from './mutateKeys';

function filterKeys(filter: (key: string) => boolean): ILayer {
    return mutateKeys((key) => (filter(key) ? key : null), (key) => key, (key) => filter(key));
}

export default filterKeys;
