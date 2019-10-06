import Cache from './Cache';
export * from './Cache';

export * from './CacheTypes';

export { default as mutateKeysLayer } from './layers/mutateKeys';
export { default as mutateValuesLayer } from './layers/mutateValues';
export { default as prefixLayer } from './layers/prefixLayer';
export { default as compose } from './utils/compose';

export default Cache;
