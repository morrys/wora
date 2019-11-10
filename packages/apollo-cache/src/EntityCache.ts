import { NormalizedCacheObject, StoreObject } from '@apollo/client/cache/inmemory/types';
import { dep, OptimisticDependencyFunction } from 'optimism';
import { isReference } from '@apollo/client/utilities/graphql/storeUtils';
import { EntityCache } from '@apollo/client/cache/inmemory/entityCache';
import Cache, { ICache, CacheOptions } from '@wora/cache-persist';

interface IPersistImpl {
    hydrate(): Promise<ICache>;
}

const hasOwn = Object.prototype.hasOwnProperty;

type DependType = OptimisticDependencyFunction<string> | null;

export class EntityRoot extends EntityCache implements IPersistImpl {
    //protected data: NormalizedCacheObject = Object.create(null);
    public cache: Cache;

    // Although each Root instance gets its own unique this.depend
    // function, any Layer instances created by calling addLayer need to
    // share a single distinct dependency function. Since this shared
    // function must outlast the Layer instances themselves, it needs to
    // be created and owned by the Root instance.
    private sharedLayerDepend: DependType = null;

    constructor({
        resultCaching = true,
        persistOptions = {},
    }: {
        resultCaching?: boolean;
        seed?: NormalizedCacheObject;
        persistOptions: CacheOptions;
    }) {
        super();
        if (resultCaching) {
            // Regard this.depend as publicly readonly but privately mutable.
            (this as any).depend = dep<string>();
            this.sharedLayerDepend = dep<string>();
        }
        const persistOptionsApollo = {
            prefix: 'apollo-cache',
            serialize: true,
            ...persistOptions,
        };
        this.cache = new Cache(persistOptionsApollo);
    }

    public hydrate(): Promise<ICache> {
        return this.cache.restore();
    }

    // It seems like this property ought to be protected rather than public,
    // but TypeScript doesn't realize it's inherited from a shared base
    // class by both Root and Layer classes, so Layer methods are forbidden
    // from accessing the .depend property of an arbitrary EntityCache
    // instance, because it might be a Root instance (and vice-versa).
    public readonly depend: DependType = null;

    public addLayer(layerId: string, replay: (layer: EntityCache) => any): EntityCache {
        // The replay function will be called in the Layer constructor.
        return new Layer(layerId, this as any, replay, this.sharedLayerDepend);
    }

    public removeLayer(layerId: string): EntityRoot {
        // Never remove the root layer.
        return this as any;
    }

    // Although the EntityCache class is abstract, it contains concrete
    // implementations of the various NormalizedCache interface methods that
    // are inherited by the Root and Layer subclasses.

    public toObject(): NormalizedCacheObject {
        return { ...this.cache.getState() };
    }

    public has(dataId: string): boolean {
        return this.cache.has(dataId);
    }

    public get(dataId: string): StoreObject {
        if (this.depend) this.depend(dataId);
        return this.cache.get(dataId);
    }

    public set(dataId: string, value: StoreObject): void {
        if (this.has(dataId) || value !== this.cache.get(dataId)) {
            this.cache.set(dataId, value);
            delete (this as any).refs[dataId];
            if (this.depend) this.depend.dirty(dataId);
        }
    }

    public delete(dataId: string): void {
        this.cache.delete(dataId);
        delete (this as any).refs[dataId];
        if (this.depend) this.depend.dirty(dataId);
    }

    public clear(): void {
        this.replace(null);
    }

    public replace(newData: NormalizedCacheObject | null): void {
        this.cache.getAllKeys().forEach((dataId) => {
            if (!(newData && hasOwn.call(newData, dataId))) {
                this.delete(dataId);
            }
        });
        if (newData) {
            Object.keys(newData).forEach((dataId) => {
                this.set(dataId, newData[dataId]);
            });
        }
    }

    public findChildRefIds(dataId: string): Record<string, true> {
        if (!hasOwn.call((this as any).refs, dataId)) {
            const found = ((this as any).refs[dataId] = Object.create(null));
            const workSet = new Set([this.cache.getState()[dataId]]);
            // Within the cache, only arrays and objects can contain child entity
            // references, so we can prune the traversal using this predicate:
            const canTraverse = (obj: any) => obj !== null && typeof obj === 'object';
            workSet.forEach((obj) => {
                if (isReference(obj)) {
                    found[obj.__ref] = true;
                } else if (canTraverse(obj)) {
                    Object.values(obj)
                        // No need to add primitive values to the workSet, since they cannot
                        // contain reference objects.
                        .filter(canTraverse)
                        .forEach(workSet.add, workSet);
                }
            });
        }
        return (this as any).refs[dataId];
    }
}

// Not exported, since all Layer instances are created by the addLayer method
// of the EntityCache.Root class.
class Layer extends EntityCache {
    constructor(
        public readonly id: string,
        public readonly parent: Layer | EntityCache.Root,
        public readonly replay: (layer: EntityCache) => any,
        public readonly depend: DependType,
    ) {
        super();
        replay(this);
    }

    public addLayer(layerId: string, replay: (layer: EntityCache) => any): EntityCache {
        return new Layer(layerId, this, replay, this.depend);
    }

    public removeLayer(layerId: string): EntityCache {
        // Remove all instances of the given id, not just the first one.
        const parent = this.parent.removeLayer(layerId);

        if (layerId === this.id) {
            // Dirty every ID we're removing.
            // TODO Some of these IDs could escape dirtying if value unchanged.
            if (this.depend) {
                Object.keys(this.data).forEach((dataId) => this.depend.dirty(dataId));
            }
            return parent;
        }

        // No changes are necessary if the parent chain remains identical.
        if (parent === this.parent) return this;

        // Recreate this layer on top of the new parent.
        return parent.addLayer(this.id, this.replay);
    }

    public toObject(): NormalizedCacheObject {
        return {
            ...this.parent.toObject(),
            ...this.data,
        };
    }

    public has(dataId: string): boolean {
        // Because the Layer implementation of the delete method uses void 0 to
        // indicate absence, that's what we need to check for here, rather than
        // calling super.has(dataId).
        if (hasOwn.call(this.data, dataId) && this.data[dataId] === void 0) {
            return false;
        }
        return this.parent.has(dataId);
    }

    public delete(dataId: string): void {
        super.delete(dataId);
        // In case this.parent (or one of its ancestors) has an entry for this ID,
        // we need to shadow it with an undefined value, or it might be inherited
        // by the Layer#get method.
        this.data[dataId] = void 0;
    }

    // All the other inherited accessor methods work as-is, but the get method
    // needs to fall back to this.parent.get when accessing a missing dataId.
    public get(dataId: string): StoreObject {
        if (hasOwn.call(this.data, dataId)) {
            return super.get(dataId);
        }
        // If this layer has a this.depend function and it's not the one
        // this.parent is using, we need to depend on the given dataId before
        // delegating to the parent. This check saves us from calling
        // this.depend(dataId) for every optimistic layer we examine, but
        // ensures we call this.depend(dataId) in the last optimistic layer
        // before we reach the root layer.
        if (this.depend && this.depend !== this.parent.depend) {
            this.depend(dataId);
        }
        return this.parent.get(dataId);
    }

    // Return a Set<string> of all the ID strings that have been retained by this
    // Layer *and* any layers/roots beneath it.
    public getRootIdSet(): Set<string> {
        const ids = this.parent.getRootIdSet();
        super.getRootIdSet().forEach(ids.add, ids);
        return ids;
    }

    public findChildRefIds(dataId: string): Record<string, true> {
        const fromParent = this.parent.findChildRefIds(dataId);
        return hasOwn.call(this.data, dataId)
            ? {
                  ...fromParent,
                  ...super.findChildRefIds(dataId),
              }
            : fromParent;
    }
}

export default EntityRoot;
