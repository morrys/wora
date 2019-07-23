import * as React from 'react';
import * as ReactDOM from 'react-dom';
import styled from 'styled-components';
import TodoList from './components/TodoList';
import IDBStorage from '@wora/cache-persist/lib/idbstorage';
import Cache, { CacheStorage }  from '@wora/cache-persist';
import { createGlobalStyle } from 'styled-components';

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
  `

const StyledApp = styled.div`
    display: flex;
    justify-content: center;
    flex-direction: column-reverse;
`;

const CacheLocalNew = new Cache({
    prefix: 'cachenew',
});

const idbStorages: CacheStorage[] = IDBStorage.create( {name: "cache", storeNames: ["persist", "persist2"], storageOptions: {}});

console.log(idbStorages[0]);

console.log(idbStorages);

const CacheLocalIDB = new Cache({
    serialize: false,
    storage: idbStorages[0],
});


const CacheLocalIDB2 = new Cache({
    serialize: false,
    storage: idbStorages[1],
});

const CacheLocal = new Cache();

const App = () => {

    return <StyledApp>
            <TodoList cache={CacheLocalIDB}/>
            <TodoList cache={CacheLocalIDB2} />
            <TodoList cache={CacheLocal}/>
            <TodoList cache={CacheLocalNew}/>
         </StyledApp>
}

ReactDOM.render(
    <React.Fragment>
        <GlobalStyle />
        <App />
    </React.Fragment>
    ,
  document.getElementById('root') as HTMLElement
);