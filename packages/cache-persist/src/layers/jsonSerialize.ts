import { IMutateValue } from '../CacheTypes';
import mutateValues from './mutateValues';

const jsonSerialize: IMutateValue = mutateValues((value) => JSON.stringify(value), (value) => JSON.parse(value));

export default jsonSerialize;
