import { Cache } from './Cache';

export * from './CacheTypes';

export { mutateKeys as mutateKeysLayer } from './layers/mutateKeys';
export { mutateValues as mutateValuesLayer } from './layers/mutateValues';
export { prefixLayer } from './layers/prefixLayer';
export { compose } from './utils/compose';
export { Cache };

export default Cache;
