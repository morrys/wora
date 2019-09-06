
const createMigrate = function(
    migrations: any,
    config: { debug?: boolean } = {}
) {
    const { debug = false } = config;
    return function (
        state: any,
        currentVersion: number
    ): Promise<any> {
        if (!state) {
            if (process.env.NODE_ENV !== 'production' && debug)
                console.log('redux-persist: no inbound state, skipping migration')
            return Promise.resolve(undefined)
        }

        let inboundVersion: number =
            state._persist && state._persist.version !== undefined
                ? state._persist.version
                : -1
        if (inboundVersion === currentVersion) {
            if (process.env.NODE_ENV !== 'production' && debug)
                console.log('redux-persist: versions match, noop migration')
            return Promise.resolve(state)
        }
        if (inboundVersion > currentVersion) {
            if (process.env.NODE_ENV !== 'production')
                console.error('redux-persist: downgrading version is not supported')
            return Promise.resolve(state)
        }

        let migrationKeys = Object.keys(migrations)
            .map(ver => parseInt(ver))
            .filter(key => currentVersion >= key && key > inboundVersion)
            .sort((a, b) => a - b)

        if (process.env.NODE_ENV !== 'production' && debug)
            console.log('redux-persist: migrationKeys', migrationKeys)
        try {
            let migratedState = migrationKeys.reduce((state, versionKey) => {
                if (process.env.NODE_ENV !== 'production' && debug)
                    console.log(
                        'redux-persist: running migration for versionKey',
                        versionKey
                    )
                return migrations[versionKey](state)
            }, state)
            return Promise.resolve(migratedState)
        } catch (err) {
            return Promise.reject(err)
        }
    }
}

export default createMigrate;