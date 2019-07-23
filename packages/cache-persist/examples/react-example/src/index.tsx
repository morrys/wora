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

const CacheSessionNew = new Cache({
    prefix: 'cachenew',
    webStorage: 'session'
});

const idbStorages: CacheStorage[] = IDBStorage.create( {name: "cache", storeNames: ["persist", "persist2"]});

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
            <TodoList cache={CacheLocalIDB} name = "CacheLocalIDB" />
            <TodoList cache={CacheLocalIDB2} name = "CacheLocalIDB2" />
            <TodoList cache={CacheLocal} name = "CacheLocal"/>
            <TodoList cache={CacheLocalNew} name = "CacheLocalNew"/>
            <TodoList cache={CacheSessionNew} name = "CacheSessionNew" />
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