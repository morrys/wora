import Cache, { CacheOptions, ICache } from '@wora/cache-persist';
import { NetInfo } from '@wora/netinfo';

const isServer = typeof window === 'undefined';

export type Request<T> = {
    payload: T;
    backup?: any;
    sink?: any;
};

export type OfflineRecordCache<T> = {
    id: string;
    request: Request<T>;
    fetchTime: number;
    retry?: number;
    error?: any;
    serial?: boolean;
};

export type OfflineFirstOptions<T> = {
    manualExecution?: boolean;
    execute: (offlineRecord: OfflineRecordCache<T>) => Promise<any>;
    start?: (mutations: Array<OfflineRecordCache<T>>) => Promise<Array<OfflineRecordCache<T>>>;
    onExecute?: (mutation: OfflineRecordCache<T>) => Promise<OfflineRecordCache<T>>;
    finish?: (mutations: ReadonlyArray<OfflineRecordCache<T>>, error?: Error) => Promise<void>;
    onComplete?: (options: { offlineRecord: OfflineRecordCache<T>; response: any }) => Promise<boolean>;
    onDiscard?: (options: { offlineRecord: OfflineRecordCache<T>; error: any }) => Promise<boolean>;
    onPublish?: (offlineRecord: OfflineRecordCache<T>) => Promise<OfflineRecordCache<T>>;
    compare?: (v1: OfflineRecordCache<T>, v2: OfflineRecordCache<T>) => number;
    // onDispatch?: (request: any) => any;
};

const defaultOfflineOptions = {
    manualExecution: false,
    start: (_mutations) => Promise.resolve(_mutations),
    finish: (_mutations, _error) => Promise.resolve(undefined),
    onExecute: (mutation) => Promise.resolve(mutation),
    onComplete: (_options) => Promise.resolve(true),
    onDiscard: (_options) => Promise.resolve(true),
    compare: (v1, v2) => v1.fetchTime - v2.fetchTime,
    onPublish: (offlineRecord) => Promise.resolve(offlineRecord),
    execute: (_offlineRecord) => Promise.reject(new Error('set execute offline options')),
} as OfflineFirstOptions<any>;

class OfflineFirst<T> {
    private offlineStore: ICache;
    private busy = false;
    private offlineOptions: OfflineFirstOptions<T> = defaultOfflineOptions;
    private online = isServer;
    private rehydrated = isServer;
    private promisesRestore;

    constructor(persistOptions: CacheOptions = {}) {
        const persistOptionsStoreOffline = {
            prefix: 'offline-first',
            serialize: true,
            ...persistOptions,
        };

        this.offlineStore = new Cache(persistOptionsStoreOffline);

        if (this.rehydrated) {
            this.promisesRestore = Promise.resolve(true);
        }
    }

    public setOfflineOptions(offlineOptions?: OfflineFirstOptions<T>): void {
        this.offlineOptions = {
            ...defaultOfflineOptions,
            ...offlineOptions,
            // onDispatch: (request: any) => undefined,
        } as OfflineFirstOptions<T>;
    }

    public purge(): Promise<boolean> {
        this.offlineStore.purge();
        return this.offlineStore.flush().then(() => {
            this.notify();
            return true;
        });
    }

    public isManualExecution(): boolean {
        const { manualExecution } = this.offlineOptions;
        return manualExecution;
    }

    public hydrate(): Promise<boolean> {
        if (!this.promisesRestore) {
            this.promisesRestore = Promise.all([NetInfo.isConnected.fetch(), this.offlineStore.restore()])
                .then((result) => {
                    NetInfo.isConnected.addEventListener('connectionChange', (isConnected: boolean) => {
                        this.online = isConnected;
                        if (isConnected && !this.isManualExecution()) {
                            this.process();
                        }
                    });
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
                    this.promisesRestore = null;
                    throw error;
                });
        }

        return this.promisesRestore;
    }

    public isOnline(): boolean {
        return this.online;
    }

    public subscribe(callback: (state: any, action: any) => void): () => void {
        return this.offlineStore.subscribe(callback);
    }

    public notify(): void {
        const { compare } = this.offlineOptions;
        this.offlineStore.notify({ state: Object.values<OfflineRecordCache<T>>(this.getState()).sort(compare) });
    }

    public getState(): { [key: string]: any } {
        return this.offlineStore.getState();
    }

    public remove(id: string): Promise<void> {
        this.offlineStore.remove(id);
        return this.offlineStore.flush().then(() => this.notify());
    }

    public set(id: string, value: OfflineRecordCache<T>): Promise<void> {
        this.offlineStore.set(id, value);
        return this.offlineStore.flush().then(() => this.notify());
    }

    public getListMutation(): Array<OfflineRecordCache<T>> {
        const { compare } = this.offlineOptions;
        const requests = Object.assign({}, this.getState());
        return Object.values<OfflineRecordCache<T>>(requests).sort(compare);
    }

    public process(): Promise<void> {
        if (!this.busy) {
            this.busy = true;
            const { start, finish, onExecute } = this.offlineOptions;
            const listMutation: Array<OfflineRecordCache<T>> = this.getListMutation();
            let parallelPromises = [];
            return start(listMutation).then(async (startMutations) => {
                try {
                    for (const mutation of startMutations) {
                        const processMutation = await onExecute(mutation);
                        if (processMutation) {
                            if (!processMutation.serial) {
                                parallelPromises.push(this.executeMutation(processMutation));
                            } else {
                                await Promise.all(parallelPromises)
                                    .then(() => this.executeMutation(processMutation))
                                    .catch((error) => {
                                        throw error;
                                    });
                                parallelPromises = [];
                            }
                        }
                    }
                    if (parallelPromises.length > 0) {
                        await Promise.all(parallelPromises);
                    }
                    return finish(this.getListMutation());
                    // TODO verify the execution of all mutations to natively implement retry logics
                } catch (error) {
                    return finish(this.getListMutation(), error);
                } finally {
                    this.busy = false;
                }
            });
        }
    }

    public executeMutation(offlineRecord: OfflineRecordCache<T>): Promise<void> {
        const { execute, onComplete, onDiscard } = this.offlineOptions;
        const { id } = offlineRecord;
        offlineRecord.error = undefined;
        offlineRecord.retry = offlineRecord.retry ? offlineRecord.retry + 1 : 0;
        return this.set(id, { ...offlineRecord }).then(() => {
            return execute(offlineRecord)
                .then(async (response) => {
                    offlineRecord.error = undefined;
                    return onComplete({ offlineRecord, response }).then((complete) => {
                        if (complete) {
                            return this.remove(id);
                        }
                        return this.set(id, { ...offlineRecord });
                    });
                })
                .catch((error) => {
                    offlineRecord.error = error;
                    return onDiscard({ offlineRecord, error }).then((discard) => {
                        if (discard) {
                            return this.remove(id);
                        }
                        return this.set(id, { ...offlineRecord });
                    });
                });
        });
    }

    public publish(options: { id?: string; request: Request<T>; serial?: boolean }): Promise<OfflineRecordCache<T>> {
        const { onPublish } = this.offlineOptions;
        const id = options.id ? options.id : `${this.offlineStore.getAllKeys().length}`;
        const { request, serial } = options;
        const fetchTime = Date.now();
        return onPublish({ id, request, fetchTime, serial }).then((offlineRecord) => {
            return this.set(offlineRecord.id, offlineRecord)
                .then(() => offlineRecord)
                .catch((error) => {
                    throw error;
                });
        });
    }
}

export default OfflineFirst;
