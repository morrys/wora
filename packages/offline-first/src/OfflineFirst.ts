import Cache, { CacheOptions } from '@wora/cache-persist';
import { NetInfo } from '@wora/netinfo';

export type Request<T> = {
    payload: T;
    backup?: any;
    sink?: any;
};

export type OfflineRecordCache<T> = {
    id: string;
    request: Request<T>;
    fetchTime: number;
    state?: string;
    retry?: number;
    error?: any;
    serial?: boolean;
};

export type OfflineFirstOptions<T> = {
    manualExecution?: boolean;
    execute: (offlineRecord: OfflineRecordCache<T>) => Promise<any>;
    finish?: (success: boolean, mutations: ReadonlyArray<OfflineRecordCache<T>>) => void;
    onComplete?: (options: { offlineRecord: OfflineRecordCache<T>; response: any }) => boolean;
    onDiscard?: (options: { offlineRecord: OfflineRecordCache<T>; error: any }) => boolean;
    onPublish?: (offlineRecord: OfflineRecordCache<T>) => OfflineRecordCache<T>;
    compare?: (v1: OfflineRecordCache<T>, v2: OfflineRecordCache<T>) => number;
    // onDispatch?: (request: any) => any;
};

class OfflineFirst<T> {
    private offlineStore: Cache;
    private busy = false;
    private offlineOptions: OfflineFirstOptions<T>;
    private online = false;
    private rehydrated = false;

    constructor(offlineOptions?: OfflineFirstOptions<T>, persistOptions: CacheOptions = {}) {
        const persistOptionsStoreOffline = {
            prefix: 'offline-first',
            serialize: true,
            ...persistOptions,
        };

        this.offlineStore = new Cache(persistOptionsStoreOffline);
        this.offlineOptions = {
            manualExecution: false,
            finish: (_success, _mutations) => undefined,
            onComplete: (_options: { offlineRecord: OfflineRecordCache<T>; response: any }) => {
                return true;
            },
            onDiscard: (_options: { offlineRecord: OfflineRecordCache<T>; error: any }) => {
                return true;
            },
            compare: (v1: OfflineRecordCache<T>, v2: OfflineRecordCache<T>) => v1.fetchTime - v2.fetchTime,
            onPublish: (offlineRecord) => offlineRecord,
            ...offlineOptions,
            // onDispatch: (request: any) => undefined,
        } as OfflineFirstOptions<T>;
    }

    public purge(): Promise<boolean> {
        return this.offlineStore.purge().then((purged) => {
            this.notify();
            return purged;
        });
    }

    public isManualExecution(): boolean {
        const { manualExecution } = this.offlineOptions;
        return manualExecution;
    }

    public addNetInfoListener(callback: (info: any) => void, onlyIsConnected = true): { remove: () => void } {
        if (onlyIsConnected) {
            return NetInfo.isConnected.addEventListener('connectionChange', (isConnected: boolean) => callback(isConnected));
        }
        return NetInfo.addEventListener((netinfo: any) => callback(netinfo));
    }

    public restore(): Promise<boolean> {
        if (this.rehydrated) {
            return Promise.resolve(true);
        }
        this.addNetInfoListener((isConnected: boolean) => {
            this.online = isConnected;
            if (isConnected && !this.isManualExecution()) {
                this.process();
            }
        });
        return Promise.all([NetInfo.isConnected.fetch(), this.offlineStore.restore()])
            .then((result) => {
                const isConnected = result[0];
                this.online = isConnected;
                if (isConnected && !this.isManualExecution()) {
                    this.process();
                }
                this.notify();
                this.rehydrated = true;
                return true;
            })
            .catch((error) => {
                this.rehydrated = false;
                throw error;
            });
    }

    public isOnline(): boolean {
        return this.online;
    }

    public subscribe(callback: (message: any, state: any) => void): () => void {
        const { compare } = this.offlineOptions;
        const offlineCallback = (message: any, state: any): void => {
            callback(message, Object.values<OfflineRecordCache<T>>(state).sort(compare));
        };
        return this.offlineStore.subscribe(offlineCallback);
    }

    public notify(): void {
        this.offlineStore.notify();
    }

    public getState(): { [key: string]: any } {
        return this.offlineStore.getState();
    }

    public remove(id: string): Promise<any> {
        return this.offlineStore.remove(id);
    }

    public getListMutation(): ReadonlyArray<OfflineRecordCache<T>> {
        const { compare } = this.offlineOptions;
        const requests = Object.assign({}, this.getState());
        return Object.values<OfflineRecordCache<T>>(requests).sort(compare);
    }

    public async process(): Promise<void> {
        if (!this.busy) {
            this.busy = true;
            const { finish } = this.offlineOptions;
            const listMutation: ReadonlyArray<OfflineRecordCache<T>> = this.getListMutation();
            let parallelPromises = [];
            let isSuccess = true;
            for (const mutation of listMutation) {
                if (!mutation.state) {
                    if (!mutation.serial) {
                        parallelPromises.push(this.executeMutation(mutation));
                    } else {
                        isSuccess = await Promise.all(parallelPromises)
                            .then(() =>
                                this.executeMutation(mutation)
                                    .then((result) => result)
                                    .catch((_error) => false),
                            )
                            .catch(() => false);
                        parallelPromises = [];
                        if (!isSuccess) break;
                    }
                }
            }
            if (isSuccess && parallelPromises.length > 0) {
                isSuccess = await Promise.all(parallelPromises)
                    .then(() => true)
                    .catch(() => false);
            }
            await finish(isSuccess, this.getListMutation());
            // TODO verify the execution of all mutations to natively implement retry logics
            this.busy = false;
        }
    }

    public async executeMutation(offlineRecord: any): Promise<boolean> {
        const { execute, onComplete, onDiscard } = this.offlineOptions;
        const { id } = offlineRecord;
        offlineRecord.state = 'start';
        offlineRecord.error = undefined;
        offlineRecord.retry = offlineRecord.retry ? offlineRecord.retry + 1 : 0;
        await this.offlineStore.set(id, { ...offlineRecord });
        this.notify();
        return execute(offlineRecord)
            .then(async (response) => {
                offlineRecord.state = 'complete';
                offlineRecord.error = undefined;
                if (await onComplete({ offlineRecord, response })) {
                    this.remove(id);
                } else {
                    this.offlineStore.set(id, { ...offlineRecord });
                }
                this.notify();
                return true;
            })
            .catch(async (error) => {
                offlineRecord.error = error;
                if (await onDiscard({ offlineRecord, error })) {
                    this.remove(id);
                    this.notify();
                    return true;
                }
                this.offlineStore.set(id, { ...offlineRecord });
                this.notify();
                throw error;
            });
    }

    public async publish(options: { id?: string; request: Request<T>; serial?: boolean }): Promise<OfflineRecordCache<T>> {
        const { onPublish } = this.offlineOptions;
        const id = options.id ? options.id : `${this.offlineStore.getAllKeys().length}`;
        const { request, serial } = options;
        const fetchTime = Date.now();
        const offlineRecord: OfflineRecordCache<T> = onPublish({ id, request, fetchTime, serial });
        return this.offlineStore
            .set(id, offlineRecord)
            .then(() => {
                return offlineRecord;
            })
            .catch((error) => {
                throw error;
            });
    }
}

export default OfflineFirst;
