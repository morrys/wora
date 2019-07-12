import Cache, { CacheOptions } from "@wora/cache-persist";
import { NetInfo } from "@wora/detect-network";

export type Request<T> = {
    payload: T,
    backup?: any,
    sink?: any,
}

export type OfflineRecordCache<T> = {
    id: string,
    request: Request<T>,
    fetchTime: number,
    state?: string,
    retry?: number,
    error?: any,
    serial?: boolean
}

export type OfflineFirstOptions<T> = {
    manualExecution?: boolean;
    execute: (offlineRecord: OfflineRecordCache<T>) => Promise<any>,
    finish?: (success: boolean, mutations: ReadonlyArray<OfflineRecordCache<T>> ) => void,
    onComplete?: (options: { offlineRecord: OfflineRecordCache<T>, response: any }) => boolean;
    onDiscard?: (options: { offlineRecord: OfflineRecordCache<T>, error: any }) => boolean;
    compare?: (v1: OfflineRecordCache<T>, v2: OfflineRecordCache<T>) => number;
    //onDispatch?: (request: any) => any;
}

class OfflineFirst<T> {

    private _offlineStore: Cache;
    private _busy: boolean = false;
    private _offlineOptions: OfflineFirstOptions<T>;
    private _isOnline = false;
    private _isRehydrated = false;

    constructor(offlineOptions?: OfflineFirstOptions<T>, persistOptions: CacheOptions = {}, ) {

        const persistOptionsStoreOffline = {
            prefix: 'offline-first',
            serialize: true,
            ...persistOptions,
        };

        this._offlineStore = new Cache(persistOptionsStoreOffline);
        this._offlineOptions = {
            manualExecution: false,
            finish: (success, mutations) => {  },
            onComplete: (options: { offlineRecord: OfflineRecordCache<T>, response: any }) => { return true },
            onDiscard: (options: { offlineRecord: OfflineRecordCache<T>, error: any }) => { return true },
            compare: (v1: OfflineRecordCache<T>, v2: OfflineRecordCache<T>) => v1.fetchTime - v2.fetchTime,
            ...offlineOptions
            //onDispatch: (request: any) => undefined,
        }

    }


    public purge(): Promise<boolean> {
        return this._offlineStore.purge().then(purged => {
            this.notify();
            return purged;
        });
    }

    public isManualExecution(): boolean {
        const { manualExecution } = this._offlineOptions
        return manualExecution;
    }

    public restore(): Promise<boolean> {
        if (this._isRehydrated) {
            return Promise.resolve(true);
        }
        NetInfo.isConnected.addEventListener('connectionChange', isConnected => {
            this._isOnline = isConnected;
            if (isConnected && !this.isManualExecution()) {
                this.process();
            }
        });
        ;
        return Promise.all([NetInfo.isConnected.fetch(), this._offlineStore.restore(),]).then(result => {
            const isConnected = result[0];
            this._isOnline = isConnected;
            if (isConnected && !this.isManualExecution()) {
                this.process();
            }
            this.notify();
            this._isRehydrated = true;
            return true;
        }).catch(error => {
            this._isRehydrated = false;
            throw error;
        })
    }

    public isOnline(): boolean {
        return this._isOnline;
    }

    public subscribe(
        callback: (message, state) => void,
    ): () => void {
        const { compare } = this._offlineOptions;
        const offlineCallback = (message, state) => {
            callback(message, Object.values<OfflineRecordCache<T>>(state).sort(compare));
        }
        return this._offlineStore.subscribe(offlineCallback);
    }

    public notify(): void {
        this._offlineStore.notify();
    }

    public getState() {
        return this._offlineStore.getState();
    }

    public remove(id: string) {
        this._offlineStore.remove(id);
    }

    public getListMutation(): ReadonlyArray<OfflineRecordCache<T>> {
        const { compare } = this._offlineOptions;
        const requests = Object.assign({}, this.getState());
        return Object.values<OfflineRecordCache<T>>(requests).sort(compare);
    }


    public async process() {

        if (!this._busy) {
            this._busy = true;
            const { finish } = this._offlineOptions
            const listMutation: ReadonlyArray<OfflineRecordCache<T>> = this.getListMutation();
            let parallelPromises = [];
            let isSuccess: boolean = true;
            for (const mutation of listMutation) {
                if (!mutation.state) {
                    if (!mutation.serial) {
                        parallelPromises.push(this.executeMutation(mutation))
                    } else {
                        isSuccess = await Promise.all(parallelPromises).then(() =>  this.executeMutation(mutation).then(result => result).catch(error => false)).catch (() => false);
                        parallelPromises = [];
                        if (!isSuccess)
                            break;
                    }
                }

            }
            if(isSuccess && parallelPromises.length>0) {
                isSuccess = await Promise.all(parallelPromises).then(() => true).catch(() => false)
            }
            await finish(isSuccess, this.getListMutation());
            // TODO verify the execution of all mutations to natively implement retry logics
            this._busy = false;


        }
    }

    async executeMutation(offlineRecord: any): Promise<boolean> {
        const { execute, onComplete, onDiscard } = this._offlineOptions;
        const { id } = offlineRecord;
        offlineRecord.state = 'start';
        offlineRecord.error = undefined;
        offlineRecord.retry = offlineRecord.retry ? offlineRecord.retry + 1 : 0;
        await this._offlineStore.set(id, { ...offlineRecord });
        this.notify();
        return execute(offlineRecord).then(async response => {
            offlineRecord.state = 'complete';
            offlineRecord.error = undefined;
            if (await onComplete({ offlineRecord, response })) {
                this.remove(id);
            } else {
                this._offlineStore.set(id, { ...offlineRecord });

            }
            this.notify();
            return true;
        }).catch(async error => {
            offlineRecord.error = error;
            if (await onDiscard({ offlineRecord, error })) {
                this.remove(id);
                this.notify();
                return true;
            } else {
                this._offlineStore.set(id, { ...offlineRecord });
                this.notify();
                throw error;
            }
        });
    }

    async publish(options: {
        id?: string,
        request: Request<T>,
        serial?,
    }): Promise<OfflineRecordCache<T>> {

        const id = options.id ? options.id : "" + this._offlineStore.getAllKeys().length;
        const { request, serial } = options;
        const fetchTime = Date.now();
        const offlineRecord: OfflineRecordCache<T> = { id, request, fetchTime, serial };
        return this._offlineStore.set(id, offlineRecord).then(() => {
            return offlineRecord;
        }).catch(error => {
            throw error;
        });
    };
}

export default OfflineFirst;