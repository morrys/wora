import { Store as RelayModernStore } from 'relay-runtime';
import { Scheduler, NormalizationSelector, OperationLoader, Disposable } from 'relay-runtime/lib/RelayStoreTypes';

import * as RelayReferenceMarker from 'relay-runtime/lib/RelayReferenceMarker';

import Cache, { CacheOptions } from '@wora/cache-persist';
import RecordSource from './RecordSource';

export default class Store extends RelayModernStore {
    _cache: Cache;
    checkGC: () => boolean;
    _defaultTTL: number;

    constructor(
        defaultTTL: number = 10 * 60 * 1000,
        persistOptions: CacheOptions = {},
        persistOptionsRecords: CacheOptions = {},
        gcScheduler?: Scheduler,
        operationLoader?: OperationLoader,
    ) {
        const persistOptionsStore = {
            prefix: 'relay-store',
            serialize: true,
            ...persistOptions,
        };
        const persistOptionsRecordSource = {
            prefix: 'relay-records',
            serialize: true,
            ...persistOptions,
            ...persistOptionsRecords,
        };
        const cacheRecordSource = new Cache(persistOptionsRecordSource);
        const recordSource = new RecordSource(cacheRecordSource);

        super(recordSource, gcScheduler, operationLoader);

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

    public restore(): Promise<Cache[]> {
        return Promise.all([this._cache.restore(), (this as any)._recordSource.restore()]);
    }

    public retain(selector: NormalizationSelector, retainConfig: any = {}): Disposable {
        const { ttl = this._defaultTTL, execute = true } = retainConfig;
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
            retainTime: execute || !root ? Date.now() : root.retainTime,
            dispose: false,
            execute: execute,
            ttl: !execute || !root ? ttl : root.ttl,
        };
        this._cache.set(name, newRoot);
        return { dispose };
    }

    public __gc(): void {
        if (!this.checkGC()) {
            return;
        }
        const references = new Set();
        this._cache.getAllKeys().forEach((index) => {
            const selRoot = this._cache.get(index);
            const expired = !this.isCurrent(selRoot.retainTime, selRoot.ttl);
            if (!selRoot.dispose || !expired) {
                RelayReferenceMarker.mark((this as any)._recordSource, selRoot.selector, references, (this as any)._operationLoader);
            } else {
                this._cache.remove(index);
            }
        });
        // Short-circuit if *nothing* is referenced
        if (!references.size) {
            (this as any)._recordSource.clear();
            return;
        }
        // Evict any unreferenced nodes
        const storeIDs = (this as any)._recordSource.getRecordIDs();
        for (let ii = 0; ii < storeIDs.length; ii++) {
            const dataID = storeIDs[ii];
            if (!references.has(dataID)) {
                (this as any)._recordSource.remove(dataID);
            }
        }
    }

    private isCurrent(fetchTime: number, ttl: number): boolean {
        return fetchTime + ttl >= Date.now();
    }
}
