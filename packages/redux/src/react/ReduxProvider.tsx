import { Provider } from 'react-redux';
import React from 'react';

const ReduxProvider = (props: any) => {
    const { loading, store, ...others } = props;
    const [isRehydrated, setRehydrated] = React.useState(store.isRehydrated());

    React.useEffect( () => {
        if(!isRehydrated) {
            store.restore().then(() => { 
                setRehydrated(true)
            });
        }
    }, []); //

    return isRehydrated ? <Provider store={store} {...others} /> : loading
}

export default ReduxProvider;