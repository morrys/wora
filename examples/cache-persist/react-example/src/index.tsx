import * as React from 'react';
import * as ReactDOM from 'react-dom';
import styled from 'styled-components';
import TodoList from './components/TodoList';
import IDBStorage from '@wora/cache-persist/lib/idbstorage';
import Cache, { ICacheStorage } from '@wora/cache-persist';
import filterKeys from '@wora/cache-persist/lib/layers/filterKeys';
import { createGlobalStyle } from 'styled-components';
import { IMutateKey } from '@wora/cache-persist/lib/CacheTypes';
// import { unwrap } from 'idb';

const GlobalStyle = createGlobalStyle`
body {
    font: 14px 'Helvetica Neue', Helvetica, Arial, sans-serif;
    line-height: 1.4em;
    background: #f5f5f5;
    color: #4d4d4d;
    min-width: 230px;
    max-width: 550px;
    margin: 0 auto;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-weight: 300;
  }
  `;

const StyledApp = styled.div`
    display: flex;
    justify-content: center;
    flex-direction: column-reverse;
`;

const filterPersistReplace: IMutateKey = filterKeys((key) => key.includes('replace'));

const filterNoPersistReplace: IMutateKey = filterKeys((key) => !key.includes('replace'));

const CacheLocal = new Cache({
    mutateKeys: [filterNoPersistReplace],
});

const CacheLocalNew = new Cache({
    errorHandling: (error) => {
        console.log('error', error);
        return true;
    },
    mutateKeys: [filterPersistReplace],
    prefix: 'cachenew',
});

const CacheSessionNew = new Cache({
    prefix: 'cachenew',
    throttle: 5000,
    webStorage: 'session',
});

const idbStorages: ICacheStorage[] = IDBStorage.create({
    name: 'cache',
    onUpgrade: (db, oldv, newv, transaction) => {
        console.log('onUpgrade', db, oldv, newv, transaction);
    },
    storeNames: ['persist', 'persist2'],
    version: 1,
});

const idbStorageNo: ICacheStorage[] = IDBStorage.create({
    name: 'nocache',
    onUpgrade: (db, oldv, newv, transaction) => {
        console.log('onUpgrade', db, oldv, newv, transaction);
    },
    storeNames: ['persist'],
    version: 1,
});

console.log(idbStorages[0]);

console.log(idbStorages);

const CacheLocalIDBNO = new Cache({
    prefix: null,
    serialize: false,
    storage: idbStorageNo[0],
});

const CacheLocalIDB = new Cache({
    mutateKeys: [filterNoPersistReplace],
    serialize: false,
    storage: idbStorages[0],
});

const CacheLocalIDB2 = new Cache({
    mutateKeys: [filterPersistReplace],
    serialize: false,
    storage: idbStorages[1],
});

const CacheLocalDisable = new Cache({
    disablePersist: true,
});

const App = () => {
    return (
        <StyledApp>
            <TodoList cache={CacheLocalDisable} name="CacheLocal Disable" />
            <TodoList cache={CacheLocalIDBNO} name="CacheLocalIDBNO" />
            <TodoList cache={CacheLocalIDB} name="CacheLocalIDB" />
            <TodoList cache={CacheLocalIDB2} name="CacheLocalIDB2" />
            <TodoList cache={CacheLocal} name="CacheLocal" />
            <TodoList cache={CacheLocalNew} name="CacheLocalNew" />
            <TodoList cache={CacheSessionNew} name="CacheSessionNew" />
        </StyledApp>
    );
};

ReactDOM.render(
    <React.Fragment>
        <GlobalStyle />
        <App />
    </React.Fragment>,
    document.getElementById('root') as HTMLElement,
);
