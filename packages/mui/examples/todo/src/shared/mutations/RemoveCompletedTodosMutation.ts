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
  // RecordSourceSelectorProxy,
} from 'react-relay';

import {ConnectionHandler} from 'relay-runtime';

const mutation = graphql`
  mutation RemoveCompletedTodosMutation($input: RemoveCompletedTodosInput!) {
    removeCompletedTodos(input: $input) {
      deletedTodoIds
      user {
        completedCount
        totalCount
      }
    }
  }
`;

function sharedUpdater(
  store: any,
  user: any,
  deletedIDs: ReadonlyArray<string>,
) {
  const userProxy = store.get(user.id);
  const conn = ConnectionHandler.getConnection(userProxy, 'TodoList_todos');

  // Purposefully type forEach as void, to toss the result of deleteNode
  deletedIDs.forEach(
    (deletedID: string): void => ConnectionHandler.deleteNode(conn, deletedID),
  );
}

function commit(
  environment: any,
  todos: any,
  user: any,
) {
  const input: any = {
    userId: user.userId,
  };

  commitMutation(environment, {
    mutation,
    optimisticUpdater: (store: any) => {
      // Relay returns Maybe types a lot of times in a connection that we need to cater for
      const completedNodeIds: ReadonlyArray<string> = todos.edges
        ? todos.edges
            .filter(Boolean)
            .map((edge: any): any => edge.node)
            .filter(Boolean)
            .filter((node: any): boolean => node.complete)
            .map((node: any): string => node.id)
        : [];

      const userRecord = store.get(user.id);
      userRecord.setValue(userRecord.getValue('totalCount')-completedNodeIds.length, 'totalCount');
      userRecord.setValue(0, 'completedCount');
      sharedUpdater(store, user, completedNodeIds);
    },
    updater: (store: any) => {
      const payload = store.getRootField('removeCompletedTodos');
      const deletedIds = payload.getValue('deletedTodoIds');

      // $FlowFixMe `payload.getValue` returns mixed, not sure how to check refinement to $ReadOnlyArray<string>
      sharedUpdater(store, user, deletedIds);
    },
    variables: {
      input,
    },
  });
}

export default {commit};
