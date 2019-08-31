import AsyncStorage from '@react-native-community/async-storage';
import { Storage } from './CacheTypes';
import InternalNativeStorage from './internal/StorageNative'

function NativeStorage(): Storage {
    return InternalNativeStorage(AsyncStorage)
}

export default NativeStorage;