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
  Disposable,
  Environment,
} from 'react-relay-offline';

const mutation = graphql`
  mutation ChangeTodoStatusMutation($input: ChangeTodoStatusInput!) {
    changeTodoStatus(input: $input) {
      todo {
        id
        complete
      }
      user {
        id
        completedCount
      }
    }
  }
`;

function getOptimisticResponse(
  complete: boolean,
  todo: any,
  user: any,
): any {
  return {
    changeTodoStatus: {
      todo: {
        complete,
        id: todo.id,
      },
      user: {
        completedCount: complete
          ? user.completedCount + 1
          : user.completedCount - 1,
        id: user.id,
      },
    },
  };
}

function commit(
  environment: Environment,
  complete: boolean,
  todo: any,
  user: any,
) {
  const input: any = {
    complete,
    id: todo.id,
    userId: user.userId,
  };
  commitMutation(environment, {
    mutation,
    optimisticResponse: getOptimisticResponse(complete, todo, user),
    variables: {
      input,
    },
  });
}

export default {commit};
