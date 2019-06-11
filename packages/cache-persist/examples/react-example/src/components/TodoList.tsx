import * as React from 'react';
import styled from 'styled-components';
import TodoTextInput from './TodoTextInput';
import Todo from './Todo';
import { useEffect } from 'react';
import { useState } from 'react';
import Cache, { DataCache } from '@wora/cache-persist';

const StyledHeader = styled.div`
  padding: 10px;
  font-size: 16px;
  margin: 10px;
  margin-right: 0px;
  background-color: #0066FF;
  color: #FFF;
  border: 2px solid #0066FF;
`;

const StyledList = styled.ul`
  list-style: none;
  color: red;
  padding-left: 0;
  width: 250px;
`;

interface Props {
  cache: Cache
}


const TodoList = (props: Props) => {

  const [cache, ] = useState(props.cache)

  const [result, setResult] = useState<{loading: boolean, data: DataCache}>({loading: true, data: new Map()});

  useEffect(() => {
    cache.restore().then(() => setResult({loading: false, data: cache.getState()}))
  },
    []);


  const handleTextInputSave = (text: string) => {
    const key = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    cache.set(key, text);
    setResult({...result, data: cache.getState()});
    return;
  };

  const deleteItem = (key: string) => {
    console.log("clickkk", key);
    cache.remove(key);
    setResult({...result, data: cache.getState()});
    return;
  };

  

  const {loading, data} = result;

  console.log(data);
  const listItems = cache.getAllKeys().map((key) => (
    <Todo item={ {key, value: data[key] }} deleteItem={deleteItem} />
  ))

  if(loading) {return <div>loading...</div>}

  return <div>
    <StyledHeader>
      <TodoTextInput
        placeholder={"Add Todo to "+cache.getStorageName()}
        onSave={handleTextInputSave}
      />
      <StyledList>{listItems}</StyledList>
    </StyledHeader>
  </div>
}

export default TodoList;