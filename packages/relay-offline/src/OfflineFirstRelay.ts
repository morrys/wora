import { CacheOptions } from '@wora/cache-persist';
import { v4 as uuid } from 'uuid';
import { Network } from 'relay-runtime/lib/RelayStoreTypes';
import RelayModernEnvironment from './RelayModernEnvironment';
import { ROOT_TYPE } from 'relay-runtime/lib/RelayStoreUtils';
import RelayInMemoryRecordSource from 'relay-runtime/lib/RelayInMemoryRecordSource';
import RelayModernRecord from 'relay-runtime/lib/RelayModernRecord';
import RelayResponseNormalizer from 'relay-runtime/lib/RelayResponseNormalizer';
import { GetDataID } from 'relay-runtime/lib/RelayResponseNormalizer';
import ErrorUtils from 'fbjs/lib/ErrorUtils';
import RelayRecordSourceMutator from 'relay-runtime/lib/RelayRecordSourceMutator';
import RelayRecordSourceProxy from 'relay-runtime/lib/RelayRecordSourceProxy';
import RelayReader from 'relay-runtime/lib/RelayReader';
import { Store } from 'relay-runtime';
import normalizeRelayPayload from 'relay-runtime/lib/normalizeRelayPayload';
import { GraphQLResponseWithData } from 'relay-runtime/lib/RelayNetworkTypes';
import { NormalizationSelector, RelayResponsePayload } from 'relay-runtime/lib/RelayStoreTypes';

import { Observable as RelayObservable, RelayRecordSource } from 'relay-runtime';
import OfflineFirst, { OfflineFirstOptions, OfflineRecordCache, Request } from '@wora/offline-first';

export type Payload = {
    operation: any;
    optimisticResponse?: any;
    uploadables?: any;
};

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type OfflineOptions<T> = Omit<OfflineFirstOptions<T>, 'execute'> & {
    network?: Network;
};

class RelayStoreOffline {
    public static create<Payload>(
        environment: RelayModernEnvironment,
        persistOptions: CacheOptions = {},
        offlineOptions: OfflineOptions<Payload> = {},
    ): OfflineFirst<Payload> {
        const persistOptionsStoreOffline = {
            prefix: 'relay-offline',
            serialize: true,
            ...persistOptions,
        };

        const { onComplete, onDiscard, network, manualExecution, finish, onPublish } = offlineOptions;

        const options: OfflineFirstOptions<Payload> = {
            manualExecution,
            execute: (offlineRecord: any) => executeMutation(environment, network, offlineRecord),
            onComplete: (options: any) => complete(environment, onComplete, options),
            onDiscard: (options: any) => discard(environment, onDiscard, options),
        };
        if (onPublish) {
            options.onPublish = onPublish;
        }
        if (finish) {
            options.finish = finish;
        }
        return new OfflineFirst(options, persistOptionsStoreOffline);
    }
}

function complete(
    environment,
    onComplete = (_o): boolean => true,
    options: { offlineRecord: OfflineRecordCache<Payload>; response: any },
): boolean {
    const { offlineRecord, response } = options;
    const {
        request: { payload },
        id,
    } = offlineRecord;
    const operation = payload.operation;
    const snapshot = environment.lookup(operation.fragment);
    return onComplete({ id, offlinePayload: offlineRecord, snapshot: snapshot.data as any, response });
}

function discard(
    environment,
    onDiscard = (_o): boolean => true,
    options: { offlineRecord: OfflineRecordCache<Payload>; error: any },
): boolean {
    const { offlineRecord, error } = options;
    const { id } = offlineRecord;
    if (onDiscard({ id, offlinePayload: offlineRecord, error })) {
        const {
            request: { backup },
        } = offlineRecord;
        environment.getStore().publish(backup);
        environment.getStore().notify();
        return true;
    } else {
        return false;
    }
}

async function executeMutation(environment, network = environment.getNetwork(), offlineRecord: OfflineRecordCache<Payload>): Promise<any> {
    const {
        request: { payload },
    } = offlineRecord;
    const operation = payload.operation;
    const uploadables = payload.uploadables;
    return network.execute(operation.node.params, operation.variables, { force: true, metadata: offlineRecord }, uploadables).toPromise();
}

function _processOptimisticResponse(response: GraphQLResponseWithData, updater: any): void {
    if (response == null && updater == null) {
        return;
    }
    const optimisticUpdates: Array<any> = [];
    if (response) {
        const payload = normalizeResponse(response, this._operation.root, ROOT_TYPE, {
            getDataID: this._getDataID,
            path: [],
            request: this._operation.request,
        });
        optimisticUpdates.push({
            operation: this._operation,
            payload,
            updater,
        });
        /*if (payload.moduleImportPayloads && payload.moduleImportPayloads.length) {
        const moduleImportPayloads = payload.moduleImportPayloads;
        const operationLoader = this._operationLoader;
        invariant(
          operationLoader,
          'RelayModernEnvironment: Expected an operationLoader to be ' +
            'configured when using `@match`.',
        );
        while (moduleImportPayloads.length) {
          const moduleImportPayload = moduleImportPayloads.shift();
          const operation = operationLoader.get(
            moduleImportPayload.operationReference,
          );
          if (operation == null) {
            continue;
          }
          const selector = createNormalizationSelector(
            operation,
            moduleImportPayload.dataID,
            moduleImportPayload.variables,
          );
          const modulePayload = normalizeResponse(
            {data: moduleImportPayload.data},
            selector,
            moduleImportPayload.typeName,
            {
              getDataID: this._getDataID,
              path: moduleImportPayload.path,
              request: this._operation.request,
            },
          );
          validateOptimisticResponsePayload(modulePayload);
          optimisticUpdates.push({
            operation: this._operation,
            payload: modulePayload,
            updater: null,
          });
          if (modulePayload.moduleImportPayloads) {
            moduleImportPayloads.push(...modulePayload.moduleImportPayloads);
          }
        }
      }*/
    } else if (updater) {
        optimisticUpdates.push({
            operation: this._operation,
            payload: {
                connectionEvents: null,
                errors: null,
                fieldPayloads: null,
                incrementalPlaceholders: null,
                moduleImportPayloads: null,
                source: RelayRecordSource.create(),
            },
            updater: updater,
        });
    }
    this._optimisticUpdates = optimisticUpdates;
    optimisticUpdates.forEach((update) => this._publishQueue.applyUpdate(update));
    const updatedOwners = this._publishQueue.run();
}

function process() {
    const sink = RelayRecordSource.create();
    const combinedConnectionEvents = [];
    const mutator = new RelayRecordSourceMutator(environment.getStore().getSource(), sink, combinedConnectionEvents);
    const store = new RelayRecordSourceProxy(mutator, environment._publishQueue._getDataID, environment._publishQueue._handlerProvider);

    const processUpdate = (optimisticUpdate) => {
        if (optimisticUpdate.storeUpdater) {
            const { storeUpdater } = optimisticUpdate;
            ErrorUtils.applyWithGuard(storeUpdater, null, [store], null, 'RelayPublishQueue:applyUpdates');
        } else {
            const { operation, payload, updater } = optimisticUpdate;
            const { connectionEvents, source, fieldPayloads } = payload;
            const selectorStore = new RelayRecordSourceSelectorProxy(mutator, store, operation.fragment);
            let selectorData;
            if (source) {
                store.publishSource(source, fieldPayloads);
                selectorData = lookupSelector(source, operation.fragment);
            }
            if (connectionEvents) {
                combinedConnectionEvents.push(...connectionEvents);
            }
            if (updater) {
                ErrorUtils.applyWithGuard(updater, null, [selectorStore, selectorData], null, 'RelayPublishQueue:applyUpdates');
            }
        }
    };
}

export function publish(environment, mutationOptions): any {
    // TODO type observable
    return RelayObservable.create((sink) => {
        const { operation, optimisticResponse, optimisticUpdater, updater, uploadables } = mutationOptions;

        environment.getStore().snapshot();

        if (optimisticResponse || optimisticUpdater) {
            const sink = new RelayInMemoryRecordSource();
            const mutator = new RelayRecordSourceMutator(environment.getStore().getSource(), sink, backup);
            const store = new RelayRecordSourceProxy(mutator, environment._getDataID);
            const response = optimisticResponse || null;
            const selectorStoreUpdater = optimisticUpdater;
            const selectorStore = store.commitPayload(operation, response);
            // TODO: Fix commitPayload so we don't have to run normalize twice
            let selectorData, source;
            if (response) {
                ({ source } = normalizeRelayPayload(operation.root, response, null, {
                    getDataID: environment._getDataID,
                }));
                selectorData = RelayReader.read(source, operation.fragment, operation).data;
            }
            selectorStoreUpdater &&
                ErrorUtils.applyWithGuard(
                    selectorStoreUpdater,
                    null,
                    [selectorStore, selectorData],
                    null,
                    'RelayPublishQueue:applyUpdates',
                );
        }
        const backup = environment.getStore().getSource()._sink;
        let sinkPublish = new RelayInMemoryRecordSource();
        if (optimisticResponse) {
            const normalizePayload = normalizeResponse({ data: optimisticResponse }, operation.root, ROOT_TYPE, [], environment._getDataID);
            const { fieldPayloads, source } = normalizePayload;
            // updater only for configs
            sinkPublish = environment._publishQueue._getSourceFromPayload({
                fieldPayloads,
                operation,
                source,
                updater,
            });
            //environment._publishQueue.commitPayload(operation, payload, configs ? updater : null);
            //environment._publishQueue.run();
        }
        /*
        //environment.
        //environment.applyUpdate(optimisticUpdate);*/

        if (!optimisticResponse && optimisticUpdater) {
            const mutator = new RelayRecordSourceMutator(environment.getStore().getSource(), sinkPublish);
            const store = new RelayRecordSourceProxy(mutator, environment._getDataID);
            ErrorUtils.applyWithGuard(optimisticUpdater, null, [store], null, 'RelayPublishQueue:commitUpdaters');
            /*    
            if (optimisticUpdater != null) {
                optimisticUpdater(environment.getStore());
            }
            if (updater) {
                updater(environment.getStore())
            }*/
        }
        const id = uuid();
        const payload: Payload = {
            operation,
            optimisticResponse,
            uploadables,
        };
        const request: Request<Payload> = {
            payload,
            backup,
            sink: sinkPublish,
        };
        environment
            .getStoreOffline()
            .publish({ id, request, serial: true })
            .then((offlineRecord) => {
                environment.getStore().publish(sinkPublish);
                environment.getStore().notify();
                environment.getStoreOffline().notify();
                sink.next(offlineRecord);
                sink.complete();
            })
            .catch((error) => {
                sink.error(error, true);
            });
    });
}

function normalizeResponse(
    response: GraphQLResponseWithData,
    selector: NormalizationSelector,
    typeName: string,
    options: any,
): RelayResponsePayload {
    const { data, errors } = response;
    const source = RelayRecordSource.create();
    const record = RelayModernRecord.create(selector.dataID, typeName);
    source.set(selector.dataID, record);
    const relayPayload = RelayResponseNormalizer.normalize(source, selector, data, options);
    return {
        ...relayPayload,
        errors,
    };
}

export default RelayStoreOffline;
