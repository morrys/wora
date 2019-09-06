import { Layer } from '../CacheTypes';
import mutateValues from './mutateValues';

const jsonSerialize: Layer = mutateValues( (value) => JSON.stringify(value), (value) => JSON.parse(value) );

export default jsonSerialize;