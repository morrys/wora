/* eslint @typescript-eslint/no-unused-vars:0 */
import ExecutionEnvironment from 'fbjs/lib/ExecutionEnvironment';
const connection =
    ExecutionEnvironment.canUseDOM &&
    ((window.navigator as any).connection || (window.navigator as any).mozConnection || (window.navigator as any).webkitConnection);

// Prevent the underlying event handlers from leaking and include additional
// properties available in browsers
export type NetInfoState = {
    type: any;
    isConnected: boolean;
    isInternetReachable?: boolean | null | undefined;
    details: any;
};

export type NetInfoConfiguration = {
    reachabilityUrl: string;
    reachabilityTest: (response: Response) => Promise<boolean>;
    reachabilityLongTimeout: number;
    reachabilityShortTimeout: number;
    reachabilityRequestTimeout: number;
};

export type NetInfoChangeHandler = (state: NetInfoState) => void;

export type NetInfoSubscription = () => void;

const getConnectionInfoObject = (): NetInfoState => {
    const isConnected = !ExecutionEnvironment.canUseDOM || window.navigator.onLine;
    const result = {
        type: 'unknown',
        isConnected,
        isInternetReachable: isConnected,
        details: {
            effectiveType: 'unknown',
        },
    };
    if (!connection) {
        return result;
    }
    result.type = connection.type;
    for (const prop in connection) {
        const value = connection[prop];
        if (typeof value !== 'function' && value != null && prop !== 'type') {
            result.details[prop] = value;
        }
    }
    return result;
};

/**
 * Navigator online: https://developer.mozilla.org/en-US/docs/Web/API/NavigatorOnLine/onLine
 * Network Connection API: https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation
 */
export const NetInfo = {
    configure(configuration: Partial<NetInfoConfiguration>): void {
        throw Error('not yet implemented');
    },
    useNetInfo(configuration?: Partial<NetInfoConfiguration>): NetInfoState {
        throw Error('For hooks use this library https://www.npmjs.com/package/@wora/detect-network');
    },
    addEventListener(listener: NetInfoChangeHandler): NetInfoSubscription {
        const wrappedHandler = (): any => listener(getConnectionInfoObject());
        if (!connection) {
            if (ExecutionEnvironment.canUseDOM) {
                window.addEventListener('online', wrappedHandler, false);
                window.addEventListener('offline', wrappedHandler, false);
                return (): void => {
                    window.removeEventListener('online', wrappedHandler as any, false);
                    window.removeEventListener('offline', wrappedHandler as any, false);
                };
            }
        } else {
            connection.addEventListener('change', wrappedHandler);
            return (): void => connection.removeEventListener('change', wrappedHandler);
        }
        return (): void => undefined;
    },
    fetch(requestedInterface?: string): Promise<NetInfoState> {
        return Promise.resolve(getConnectionInfoObject());
    },
};
