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

import {
  commitMutation,
  graphql,
} from 'react-relay';


const mutation = graphql`
  mutation RemoveTodoMutation($input: RemoveTodoInput!) {
    removeTodo(input: $input) {
      deletedTodoId
      user {
        completedCount
        totalCount
      }
    }
  }
`;

function commit(
  environment: any,
  todo: any,
  user: any,
): any {
  const input: any = {
    id: todo.id,
    userId: user.userId,
  };
  return commitMutation(environment, {
    configs: [{
      deletedIDFieldName: 'deletedTodoId',
      type: 'NODE_DELETE',
    },
     ],
    mutation,
    optimisticResponse: {
      removeTodo: {
        deletedTodoId: todo.id,
        user: {
          completedCount: user.completedCount - (todo.complete ? 1 : 0),
          id: user.id,
          totalCount: (user.totalCount-1)
        },
      },
      
    },
    variables: {
      input,
    },
  });
}

export default {commit};
