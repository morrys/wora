import { Network, OperationDescriptor, UploadableMap } from 'relay-runtime';
import { OfflineFirstOptions } from '@wora/offline-first';
import { EnvironmentConfig } from 'relay-runtime/lib/store/RelayModernEnvironment';

export type Payload = {
    operation: OperationDescriptor;
    optimisticResponse?: { [key: string]: any };
    uploadables?: UploadableMap | null;
};

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type OfflineOptions<T> = Omit<OfflineFirstOptions<T>, 'execute'> & {
    network?: Network;
};

export type EnvironmentOfflineConfig = Omit<EnvironmentConfig, 'store'>; // Equivalent to: {b: number, c: boolean}
