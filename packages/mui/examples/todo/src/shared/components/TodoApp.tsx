// @flow
/**
 * This file provided by Facebook is for non-commercial testing and evaluation
 * purposes only.  Facebook reserves all rights not expressly granted.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * FACEBOOK BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import AddTodoMutation from '../mutations/AddTodoMutation';
import * as React from 'react';
// import { StyleSheet, View } from 'react-native';
// version 0.4.0
// import {createFragmentContainer, graphql, useIsConnected, useNetInfo } from 'react-relay-offline';
import {createFragmentContainer, graphql } from 'react-relay-offline';
// import TodoListFooter from './TodoListFooter';
import styled, { css } from "styled-components";
import { Paper } from '@wora/mui';
import { Typography, View } from '@wora/mui';
import TodoListFooter from "./TodoListFooter";
import TodoList from './TodoList';

const StyledTodoApp = css`
  background-color: #fff;
  margin: 4px 0 4px 0;
  position: relative;
`;


const TodoApp = ({relay, user}: any) => {
  const handleTextInputSave = (text: string) => {
    AddTodoMutation.commit(relay.environment, text, user);
    return;
  };

  // version 0.4.0
  // const isConnected = useIsConnected();
  // const netInfo = useNetInfo();

  const hasTodos = user.totalCount > 0;

  return (
    <View>
      <Paper customStyle={StyledTodoApp}>
        <View>
          <Typography variant="h6" align="center">Todos</Typography>
        </View>
        <TodoList user={user} />
        {hasTodos && <TodoListFooter user={user} />}
        </Paper>
    </View>
  );
};


export default createFragmentContainer(TodoApp, {
  user: graphql`
    fragment TodoApp_user on User {
      id
      userId
      totalCount
      completedCount
      ...TodoList_user
      ...TodoListFooter_user
    }
  `,
});
/*

      ...TodoListFooter_user
      
*/