import AsyncStorage from '@react-native-community/async-storage';
import { CacheStorage } from './CacheTypes';
import InternalNativeStorage from './internal/StorageNative'

function NativeStorage(): CacheStorage {
    return InternalNativeStorage(AsyncStorage)
}

export default NativeStorage;