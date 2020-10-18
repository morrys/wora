import { IMutateValue } from '../CacheTypes';
import { mutateValues } from './mutateValues';

export const jsonSerialize: IMutateValue = mutateValues(
    (value) => JSON.stringify(value),
    (value) => JSON.parse(value),
);
