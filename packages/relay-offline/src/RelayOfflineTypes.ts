import { Network, OperationDescriptor, UploadableMap, Snapshot } from 'relay-runtime';
import { OfflineFirstOptions, OfflineRecordCache } from '@wora/offline-first';
import { EnvironmentConfig } from 'relay-runtime/lib/store/RelayModernEnvironment';

export type Payload = {
    operation: OperationDescriptor;
    optimisticResponse?: { [key: string]: any };
    uploadables?: UploadableMap | null;
};

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type OfflineOptions<T> = Omit<OfflineFirstOptions<T>, 'execute' | 'onComplete'> & {
    network?: Network;
    onComplete?: (options: { id: string; offlinePayload: OfflineRecordCache<T>; snapshot: Snapshot; response: any }) => Promise<boolean>;
    onDiscard?: (options: { id: string; offlinePayload: OfflineRecordCache<T>; error: Error }) => Promise<boolean>;
};

export type EnvironmentOfflineConfig = Omit<EnvironmentConfig, 'store'>; // Equivalent to: {b: number, c: boolean}
