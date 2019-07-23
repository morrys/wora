import { AsyncStorage } from 'react-native';


function NativeStorage() {
    return {
        multiRemove: (keys) => {
            return AsyncStorage.multiRemove(keys);
        },
        multiGet: (keys) => {
            return AsyncStorage.multiGet(keys);
        },
        getAllKeys: () => {
            return AsyncStorage.getAllKeys();
        },
        multiSet: (items) => {
            return AsyncStorage.multiSet(items);
        },
        setItem: (key: string, value: string): Promise<void> => {
            return AsyncStorage.setItem(key, value)
        },
        removeItem: (key: string): Promise<void> => {
            return AsyncStorage.removeItem(key);
        },
    }
}

export default NativeStorage;