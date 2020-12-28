import { Store as RelayModernStore } from 'relay-runtime';
import { Disposable, OperationDescriptor, RequestDescriptor, OperationAvailability, OperationLoader } from 'relay-runtime';

import { Availability } from 'relay-runtime/lib/store/DataChecker';
import { CheckOptions, Scheduler } from 'relay-runtime/lib/store/RelayStoreTypes';
import { Cache, CacheOptions } from '@wora/cache-persist';
import { RecordSource } from './RecordSource';
import * as DataChecker from 'relay-runtime/lib/store/DataChecker';

export type StoreOptions = {
    gcScheduler?: Scheduler | null | undefined;
    operationLoader?: OperationLoader | null | undefined;
    UNSTABLE_DO_NOT_USE_getDataID?: any | null | undefined;
    gcReleaseBufferSize?: number | null | undefined;
    queryCacheExpirationTime?: number | null | undefined;
};
const hasOwn = Object.prototype.hasOwnProperty;

export class Store extends RelayModernStore {
    _cache: Cache;
    checkGC: () => boolean;

    constructor(recordSource: RecordSource, persistOptions: CacheOptions = {}, options: StoreOptions = {}) {
        const persistOptionsStore = {
            prefix: 'relay-store',
            serialize: true,
            ...persistOptions,
        };
        if (!hasOwn.call(options, 'queryCacheExpirationTime')) {
            options.queryCacheExpirationTime = 10 * 60 * 1000;
        }
        super(recordSource, options);

        this.checkGC = (): boolean => this.isRehydrated();

        this._cache = new Cache(persistOptionsStore);
        (this._cache as any).values = (): any => {
            return Object.values(this._cache.getState());
        };
        (this as any)._roots = this._cache;
    }

    public setCheckGC(checkGC = (): boolean => true): void {
        this.checkGC = checkGC;
    }

    public purge(): Promise<void[]> {
        const updateRecords = (this as any).__getUpdatedRecordIDs();
        Object.keys((this as any).getSource().toJSON()).forEach((key) => (updateRecords[key] = true));
        this._cache.purge();
        return Promise.all([this._cache.flush(), (this as any)._recordSource.purge()]).then((result) => {
            this.notify();
            return result;
        });
    }

    public hydrate(): Promise<Cache[]> {
        return Promise.all([this._cache.restore(), (this as any)._recordSource.restore()]);
    }

    public isRehydrated(): boolean {
        return this._cache.isRehydrated() && (!(this as any)._recordSource.isRehydrated || (this as any)._recordSource.isRehydrated());
    }

    public getTTL(operation: OperationDescriptor): number {
        return operation.request && operation.request.cacheConfig && (operation.request.cacheConfig as any).ttl
            ? (operation.request.cacheConfig as any).ttl
            : (this as any)._queryCacheExpirationTime;
    }

    public retain(operation: OperationDescriptor): Disposable {
        const ttl = this.getTTL(operation);

        const id = operation.request.identifier;
        let disposed = false;
        const dispose = (): void => {
            // Ensure each retain can only dispose once
            const root = this._cache.get(id);
            if (disposed || !root) {
                return;
            }
            disposed = true;
            root.refCount -= 1;
            root.dispose = root.refCount === 0;
            this._cache.set(id, root);
            let toSchedule = false;
            this._cache.getAllKeys().forEach((idCache) => {
                const { fetchTime, retainTime, ttl, dispose } = this._cache.get(idCache);
                const checkDate = fetchTime != null ? fetchTime : retainTime;
                const expired = !this.isCurrent(checkDate, ttl);

                if (dispose && expired) {
                    toSchedule = true;
                    this._cache.remove(idCache);
                }
            });
            toSchedule && (this as any).scheduleGC();
        };
        const root = this._cache.get(id);
        const refCount = !root || !root.refCount ? 1 : root.refCount + 1;
        const newRoot = {
            operation,
            dispose: false,
            refCount,
            epoch: !root ? null : root.epoch,
            ttl: !root ? ttl : root.ttl,
            retainTime: !root ? Date.now() : root.retainTime,
            fetchTime: !root ? null : root.fetchTime,
        };
        this._cache.set(id, newRoot);
        return { dispose };
    }

    /**
     * Run a full GC synchronously.
     */
    __gc(): void {
        // Don't run GC while there are optimistic updates applied
        if ((this as any)._optimisticSource != null || !this.checkGC()) {
            return;
        }
        const gcRun = (this as any)._collect();
        while (!gcRun.next().done) {}
    }

    scheduleGC(): void {
        if ((this as any)._optimisticSource != null || !this.checkGC()) {
            return;
        }
        if ((this as any)._gcHoldCounter > 0) {
            (this as any)._shouldScheduleGC = true;
            return;
        }
        if ((this as any)._gcRun) {
            return;
        }
        (this as any)._gcRun = (this as any)._collect();
        (this as any)._gcScheduler((this as any)._gcStep);
    }

    private isCurrent(fetchTime: number, ttl: number): boolean {
        return ttl && fetchTime + ttl >= Date.now();
    }

    check(operation: OperationDescriptor, options?: CheckOptions): OperationAvailability {
        const selector = operation.root;
        const source = (this as any)._optimisticSource ?? (this as any)._recordSource;
        const globalInvalidationEpoch = (this as any)._globalInvalidationEpoch;

        const rootEntry = this._cache.get(operation.request.identifier);
        const operationLastWrittenAt = rootEntry != null ? rootEntry.epoch : null;

        // Check if store has been globally invalidated
        if (globalInvalidationEpoch != null) {
            // If so, check if the operation we're checking was last written
            // before or after invalidation occured.
            if (operationLastWrittenAt == null || operationLastWrittenAt <= globalInvalidationEpoch) {
                // If the operation was written /before/ global invalidation occurred,
                // or if this operation has never been written to the store before,
                // we will consider the data for this operation to be stale
                // (i.e. not resolvable from the store).
                return { status: 'stale' };
            }
        }

        const target = options?.target ?? source;
        const handlers = options?.handlers ?? [];
        const operationAvailability = DataChecker.check(
            source,
            target,
            selector,
            handlers,
            (this as any)._operationLoader,
            (this as any)._getDataID,
        );

        return getAvailabilityStatus(
            operationAvailability,
            operationLastWrittenAt,
            rootEntry?.fetchTime,
            this.getTTL(operation),
            this.checkGC(),
        );
    }

    public notify(sourceOperation?: OperationDescriptor, invalidateStore?: boolean): ReadonlyArray<RequestDescriptor> {
        // Increment the current write when notifying after executing
        // a set of changes to the store.

        const updateRoot = sourceOperation && this._cache.has(sourceOperation.request.identifier);
        const result = super.notify(sourceOperation, invalidateStore);
        if (sourceOperation != null) {
            // We only track the epoch at which the operation was written if
            // it was previously retained, to keep the size of our operation
            // epoch map bounded. If a query wasn't retained, we assume it can
            // may be deleted at any moment and thus is not relevant for us to track
            // for the purposes of invalidation.
            if (updateRoot) {
                const id = sourceOperation.request.identifier;
                const rootEntry = this._cache.get(id);
                rootEntry.epoch = (this as any)._currentWriteEpoch;
                rootEntry.fetchTime = Date.now();
                this._cache.set(id, rootEntry);
            }
        }
        return result;
    }
}

/**
 * Returns an OperationAvailability given the Availability returned
 * by checking an operation, and when that operation was last written to the store.
 * Specifically, the provided Availablity of a an operation will contain the
 * value of when a record referenced by the operation was most recently
 * invalidated; given that value, and given when this operation was last
 * written to the store, this function will return the overall
 * OperationAvailability for the operation.
 */
/**
 * Returns an OperationAvailability given the Availability returned
 * by checking an operation, and when that operation was last written to the store.
 * Specifically, the provided Availability of an operation will contain the
 * value of when a record referenced by the operation was most recently
 * invalidated; given that value, and given when this operation was last
 * written to the store, this function will return the overall
 * OperationAvailability for the operation.
 */
function getAvailabilityStatus(
    operationAvailability: Availability,
    operationLastWrittenAt: number,
    operationFetchTime: number,
    queryCacheExpirationTime: number,
    staleForExpiration: boolean,
): OperationAvailability {
    const { mostRecentlyInvalidatedAt, status } = operationAvailability;
    if (typeof mostRecentlyInvalidatedAt === 'number') {
        // If some record referenced by this operation is stale, then the operation itself is stale
        // if either the operation itself was never written *or* the operation was last written
        // before the most recent invalidation of its reachable records.
        if (operationLastWrittenAt == null || mostRecentlyInvalidatedAt > operationLastWrittenAt) {
            return { status: 'stale' };
        }
    }

    if (status === 'missing') {
        return { status: 'missing' };
    }

    if (operationFetchTime != null && queryCacheExpirationTime != null) {
        const isStale = operationFetchTime <= Date.now() - queryCacheExpirationTime;
        if (isStale && staleForExpiration) {
            return { status: 'stale' };
        }
    }

    // There were no invalidations of any reachable records *or* the operation is known to have
    // been fetched after the most recent record invalidation.
    return { status: 'available', fetchTime: operationFetchTime ?? null };
}
