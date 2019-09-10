import { ILayer } from '../CacheTypes';
import mutateValues from './mutateValues';

const jsonSerialize: ILayer = mutateValues((value) => JSON.stringify(value), (value) => JSON.parse(value));

export default jsonSerialize;
