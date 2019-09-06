export type PersistState = {
    version: number,
    rehydrated: boolean,
  }
  
  export type PersistedState = {
    _persist: PersistState,
  } | void

  export type StateReconciler<S> =
    (inboundState: any, state: S, reducedState: S, config: PersistConfig<S>) => S;
  
  export type PersistConfig<S> = {
    version?: number,
    key: string,
    blacklist?: Array<string>, //function to use filterKey wora/cache-persist
    whitelist?: Array<string>, //function to use filterKey wora/cache-persist
    //transforms?: Array<Transform>, function to migrate in layer wora/cache-persist
    throttle?: number, //wait?
    migrate?: (PersistedState, number) => Promise<PersistedState>,
    stateReconciler?: false | StateReconciler<S>,
  }
  
  export type MigrationManifest = {
    [key: string]: (state: PersistedState) => PersistedState
  }