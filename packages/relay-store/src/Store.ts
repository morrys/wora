import { Store as RelayModernStore } from 'relay-runtime';
import { Disposable, OperationDescriptor, RequestDescriptor, OperationAvailability } from 'relay-runtime';

import * as RelayReferenceMarker from 'relay-runtime/lib/store/RelayReferenceMarker';

import { Availability } from 'relay-runtime/lib/store/DataChecker';
import { CheckOptions } from 'relay-runtime/lib/store/RelayStoreTypes';
import Cache, { CacheOptions } from '@wora/cache-persist';
import { RecordSource } from './RecordSource';
import * as DataChecker from 'relay-runtime/lib/store/DataChecker';

export type CacheOptionsStore = CacheOptions & {
    defaultTTL?: number;
};

export class Store extends RelayModernStore {
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

    public getID(operation: OperationDescriptor): string {
        return operation.root.node.name + '.' + JSON.stringify(operation.root.variables);
    }

    public retain(operation: OperationDescriptor, retainConfig: { ttl?: number } = {}): Disposable {
        const { ttl = this._defaultTTL } = retainConfig;

        const id = this.getID(operation);

        const dispose = (): void => {
            const root = this._cache.get(id);
            if (root) {
                const newRoot = {
                    ...root,
                    dispose: true,
                };
                this._cache.set(id, newRoot);
            }
            this._cache.getAllKeys().forEach((idCache) => {
                const { fetchTime, retainTime, ttl, dispose } = this._cache.get(idCache);
                const checkDate = fetchTime != null ? fetchTime : retainTime;
                const expired = !this.isCurrent(checkDate, ttl);
                if (dispose && expired) {
                    this._cache.remove(idCache);
                }
            });
            (this as any)._scheduleGC();
        };
        const root = this._cache.get(id);
        const refCount = !root ? 1 : root.refCount + 1;
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

    __gc(): void {
        if (!this.checkGC()) {
            return;
        }
        // Don't run GC while there are optimistic updates applied
        if ((this as any)._optimisticSource != null) {
            return;
        }
        const references = new Set();
        // Mark all records that are traversable from a root
        this._cache.getAllKeys().forEach((id) => {
            const { operation } = this._cache.get(id);
            const selector = operation.root;
            RelayReferenceMarker.mark((this as any)._recordSource, selector, references, (this as any)._operationLoader);
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
    }

    private isCurrent(fetchTime: number, ttl: number): boolean {
        return fetchTime + ttl >= Date.now();
    }

    check(operation: OperationDescriptor, options?: CheckOptions): OperationAvailability {
        const selector = operation.root;
        const source = (this as any)._optimisticSource ? (this as any)._optimisticSource : (this as any)._recordSource;
        const globalInvalidationEpoch = (this as any)._globalInvalidationEpoch;

        const id = this.getID(operation);
        const rootEntry = this._cache.get(id);
        const operationLastWrittenAt = rootEntry != null ? rootEntry.epoch : null;

        // Check if store has been globally invalidated
        if (globalInvalidationEpoch != null) {
            // If so, check if the operation we're checking was last written
            // before or after invalidation occured.
            if (operationLastWrittenAt == null || operationLastWrittenAt <= globalInvalidationEpoch) {
                // If the operation was written /before/ global invalidation ocurred,
                // or if this operation has never been written to the store before,
                // we will consider the data for this operation to be stale
                //  (i.e. not resolvable from the store).
                return { status: 'stale' };
            }
        }

        const target = options && options.target ? options.target : source;
        const handlers = options && options.handlers ? options.handlers : [];
        const operationAvailability = DataChecker.check(
            source,
            target,
            selector,
            handlers,
            (this as any)._operationLoader,
            (this as any)._getDataID,
        );

        return getAvailablityStatus(operationAvailability, operationLastWrittenAt, rootEntry ? rootEntry.fetchTime : undefined);
    }

    public notify(sourceOperation?: OperationDescriptor, invalidateStore?: boolean): ReadonlyArray<RequestDescriptor> {
        // Increment the current write when notifying after executing
        // a set of changes to the store.
        (this as any)._currentWriteEpoch = (this as any)._currentWriteEpoch + 1;

        if (invalidateStore === true) {
            (this as any)._globalInvalidationEpoch = (this as any)._currentWriteEpoch;
        }

        const source = (this as any).getSource();
        const updatedOwners = [];
        (this as any)._subscriptions.forEach((subscription) => {
            const owner = (this as any)._updateSubscription(source, subscription);
            if (owner != null) {
                updatedOwners.push(owner);
            }
        });
        (this as any)._invalidationSubscriptions.forEach((subscription) => {
            (this as any)._updateInvalidationSubscription(subscription, invalidateStore === true);
        });
        (this as any)._updatedRecordIDs = {};
        (this as any)._invalidatedRecordIDs.clear();

        // If a source operation was provided (indicating the operation
        // that produced this update to the store), record the current epoch
        // at which this operation was written.
        if (sourceOperation != null) {
            // We only track the epoch at which the operation was written if
            // it was previously retained, to keep the size of our operation
            // epoch map bounded. If a query wasn't retained, we assume it can
            // may be deleted at any moment and thus is not relevant for us to track
            // for the purposes of invalidation.
            //const id = sourceOperation.request.identifier;
            const id = this.getID(sourceOperation);
            const rootEntry = this._cache.get(id); // wora
            if (rootEntry != null) {
                rootEntry.epoch = (this as any)._currentWriteEpoch;
                rootEntry.fetchTime = Date.now();
                this._cache.set(id, rootEntry);
            }
        }

        return updatedOwners;
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
function getAvailablityStatus(
    opearionAvailability: Availability,
    operationLastWrittenAt: number,
    operationFetchTime: number,
): OperationAvailability {
    const { mostRecentlyInvalidatedAt, status } = opearionAvailability;
    if (typeof mostRecentlyInvalidatedAt === 'number') {
        // If some record referenced by this operation is stale, then the operation itself is stale
        // if either the operation itself was never written *or* the operation was last written
        // before the most recent invalidation of its reachable records.
        if (operationLastWrittenAt == null || mostRecentlyInvalidatedAt > operationLastWrittenAt) {
            return { status: 'stale' };
        }
    }

    // There were no invalidations of any reachable records *or* the operation is known to have
    // been fetched after the most recent record invalidation.
    /* eslint-disable indent */
    return status === 'missing'
        ? { status: 'missing' }
        : {
              status: 'available',
              fetchTime: operationFetchTime ? operationFetchTime : null,
          };
    /* eslint-enable indent */
}
