import RelayRecordState from 'relay-runtime/lib/store/RelayRecordState';
import { RecordState } from 'relay-runtime';
import { MutableRecordSource, Record, RecordMap } from 'relay-runtime/lib/store/RelayStoreTypes';
import { Cache, ICache, DataCache, CacheOptions } from '@wora/cache-persist';

const { EXISTENT, NONEXISTENT, UNKNOWN } = RelayRecordState;

export interface IMutableRecordSourceOffline extends MutableRecordSource {
    restore(): Promise<DataCache>;
}

export class RecordSource implements IMutableRecordSourceOffline {
    private _cache: ICache;

    constructor(persistOptions: CacheOptions = {}) {
        const persistOptionsRecordSource = {
            prefix: 'relay-records',
            serialize: true,
            ...persistOptions,
        };
        this._cache = new Cache(persistOptionsRecordSource);
    }

    public isRehydrated(): boolean {
        return this._cache.isRehydrated();
    }

    public purge(): Promise<void> {
        this._cache.purge();
        return this._cache.flush();
    }

    public restore(): Promise<DataCache> {
        return this._cache.restore();
    }

    public clear(): void {
        this._cache.purge();
    }

    public delete(dataID: string): void {
        this._cache.delete(dataID);
    }

    public get(dataID: string): Record<any> {
        return this._cache.get(dataID);
    }

    public getRecordIDs(): Array<string> {
        return this._cache.getAllKeys();
    }

    public getStatus(dataID: string): RecordState {
        const state = this._cache.getState();
        if (!this._cache.has(dataID)) {
            return UNKNOWN;
        }
        return state[dataID] == null ? NONEXISTENT : EXISTENT;
    }

    public has(dataID: string): boolean {
        return this._cache.has(dataID);
    }

    public remove(dataID: string): void {
        this._cache.remove(dataID);
    }

    public set(dataID: string, record: Record): void {
        this._cache.set(dataID, record);
    }

    public size(): number {
        return this._cache.getAllKeys().length;
    }

    public toJSON(): RecordMap {
        return this._cache.getState();
    }
}
