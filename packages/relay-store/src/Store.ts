import { Store as RelayModernStore } from 'relay-runtime';
import { NormalizationSelector, Disposable } from 'relay-runtime';

import * as RelayReferenceMarker from 'relay-runtime/lib/store/RelayReferenceMarker';

import Cache, { CacheOptions } from '@wora/cache-persist';
import RecordSource from './RecordSource';

export type CacheOptionsStore = CacheOptions & {
    defaultTTL?: number;
};

export default class Store extends RelayModernStore {
    _cache: Cache;
    checkGC: () => boolean;
    _defaultTTL: number;

    constructor(recordSource: RecordSource, persistOptions: CacheOptionsStore = {}, ...args) {
        const { defaultTTL = 10 * 60 * 1000 } = persistOptions;
        const persistOptionsStore = {
            prefix: 'relay-store',
            serialize: true,
            ...persistOptions,
        };
        super(recordSource, ...args);

        this.checkGC = (): boolean => true;

        this._defaultTTL = defaultTTL;

        this._cache = new Cache(persistOptionsStore);
    }

    public setCheckGC(checkGC = (): boolean => true): void {
        this.checkGC = checkGC;
    }

    public purge(): Promise<void[]> {
        this._cache.purge();
        return Promise.all([this._cache.flush(), (this as any)._recordSource.purge()]);
    }

    public hydrate(): Promise<Cache[]> {
        return Promise.all([this._cache.restore(), (this as any)._recordSource.restore()]);
    }

    public retain(selector: NormalizationSelector, retainConfig: { ttl?: number } = {}): Disposable {
        const { ttl = this._defaultTTL } = retainConfig;
        const name = selector.node.name + '.' + JSON.stringify(selector.variables);
        const dispose = (): void => {
            const root = this._cache.get(name);
            if (root) {
                const newRoot = {
                    ...root,
                    dispose: true,
                };
                this._cache.set(name, newRoot);
            }
            (this as any)._scheduleGC();
        };
        const root = this._cache.get(name);
        const newRoot = {
            selector,
            retainTime: !root ? Date.now() : root.retainTime,
            dispose: false,
            ttl: !root ? ttl : root.ttl,
        };
        this._cache.set(name, newRoot);
        return { dispose };
    }

    public __gc(): void {
        if (!this.checkGC()) {
            return;
        }
        // Don't run GC while there are optimistic updates applied
        if ((this as any)._optimisticSource != null) {
            return;
        }
        const references = new Set();
        const connectionReferences = new Set();
        // Mark all records that are traversable from a root
        this._cache.getAllKeys().forEach((index) => {
            const { retainTime, ttl, dispose, selector } = this._cache.get(index);
            const expired = !this.isCurrent(retainTime, ttl);
            if (!dispose || !expired) {
                if (RelayReferenceMarker.mark.length === 4) {
                    RelayReferenceMarker.mark((this as any)._recordSource, selector, references, (this as any)._operationLoader);
                } else {
                    RelayReferenceMarker.mark(
                        (this as any)._recordSource,
                        selector,
                        references,
                        connectionReferences,
                        (id) => (this as any).getConnectionEvents_UNSTABLE(id),
                        (this as any)._operationLoader,
                    );
                }
            } else {
                this._cache.remove(index);
            }
        });
        if (references.size === 0) {
            // Short-circuit if *nothing* is referenced
            (this as any)._recordSource.clear();
        } else {
            // Evict any unreferenced nodes
            const storeIDs = (this as any)._recordSource.getRecordIDs();
            for (let ii = 0; ii < storeIDs.length; ii++) {
                const dataID = storeIDs[ii];
                if (!references.has(dataID)) {
                    (this as any)._recordSource.remove(dataID);
                }
            }
        }
        /*
        if (connectionReferences.size === 0) {
            (this as any)._connectionEvents.clear();
        } else {
            // Evict any unreferenced connections
            for (const connectionID of (this as any)._connectionEvents.keys()) {
                if (!connectionReferences.has(connectionID)) {
                    (this as any)._connectionEvents.delete(connectionID);
                }
            }
        }*/
    }

    private isCurrent(fetchTime: number, ttl: number): boolean {
        return fetchTime + ttl >= Date.now();
    }
}
