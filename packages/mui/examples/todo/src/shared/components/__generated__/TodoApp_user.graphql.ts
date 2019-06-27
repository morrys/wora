/* tslint:disable */

import { ReaderFragment } from "relay-runtime";
type TodoListFooter_user$ref = any;
type TodoList_user$ref = any;
export type TodoApp_user$ref = any;
export type TodoApp_user = {
    readonly id: string;
    readonly userId: string;
    readonly totalCount: number;
    readonly completedCount: number;
    readonly " $fragmentRefs": TodoList_user$ref & TodoListFooter_user$ref;
    readonly " $refType": TodoApp_user$ref;
};



const node: ReaderFragment = {
  "kind": "Fragment",
  "name": "TodoApp_user",
  "type": "User",
  "metadata": null,
  "argumentDefinitions": [],
  "selections": [
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "id",
      "args": null,
      "storageKey": null
    },
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "userId",
      "args": null,
      "storageKey": null
    },
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "totalCount",
      "args": null,
      "storageKey": null
    },
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "completedCount",
      "args": null,
      "storageKey": null
    },
    {
      "kind": "FragmentSpread",
      "name": "TodoList_user",
      "args": null
    },
    {
      "kind": "FragmentSpread",
      "name": "TodoListFooter_user",
      "args": null
    }
  ]
};
(node as any).hash = '76587bf2d62dbe7c47a2f069f9c15857';
export default node;
