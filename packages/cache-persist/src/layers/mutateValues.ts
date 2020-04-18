import { IMutateValue } from '../CacheTypes';

export function mutateValues(set: (value: any) => any, get: (value: any) => any): IMutateValue {
    return { set, get } as IMutateValue;
}
