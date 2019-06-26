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

import RemoveCompletedTodosMutation from '../mutations/RemoveCompletedTodosMutation';

import React from 'react';
import { graphql, createFragmentContainer } from 'react-relay';


import styled, { css } from "styled-components";
import { Paper, Typography } from '@wora/mui';

const StyledContainer = css`
  flex-direction: row;
  background-color: #fff;
  justify-content: center;
  align-items: center;
`;

const StyleButtonContainer = css`
  flex: 1;
`;


const TodoListFooter = ({
  relay,
  user,
  user: { todos, completedCount, totalCount },
}: any) => {
  const completedEdges =
    todos && todos.edges
      ? todos.edges.filter(
        (edge: any) => edge && edge.node && edge.node.complete,
      )
      : [];

  const handleRemoveCompletedTodosClick = () => {
    RemoveCompletedTodosMutation.commit(
      relay.environment,
      {
        edges: completedEdges,
      },
      user,
    );
  };

  const numRemainingTodos = totalCount - completedCount;

  return (
    <Paper customStyle={StyledContainer}>
      <Paper customStyle={StyleButtonContainer}>
        <Typography variant="subtitle1" align="center">
          {numRemainingTodos + " Item" + (numRemainingTodos === 1 ? '' : 's') + " left"}
        </Typography>
      </Paper>

      <Paper customStyle={StyleButtonContainer}>
        {/*<Button
        onPress={handleRemoveCompletedTodosClick}
        title="Clear completed"
        disabled={completedCount == 0}
        accessibilityLabel="Clear completed"
        />*/}
      </Paper>
    </Paper>
  );
};

export default createFragmentContainer(TodoListFooter, {
  user: graphql`
    fragment TodoListFooter_user on User {
      id
      userId
      completedCount
      todos(
        first: 2147483647 # max GraphQLInt
      ) @connection(key: "TodoList_todos") {
        edges {
          node {
            id
            complete
          }
        }
      }
      totalCount
    }
  `,
});
