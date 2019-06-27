/* tslint:disable */

import { ReaderFragment } from "relay-runtime";
export type Todo_todo$ref = any;
export type Todo_todo = {
    readonly complete: boolean;
    readonly id: string;
    readonly text: string;
    readonly " $refType": Todo_todo$ref;
};



const node: ReaderFragment = {
  "kind": "Fragment",
  "name": "Todo_todo",
  "type": "Todo",
  "metadata": null,
  "argumentDefinitions": [],
  "selections": [
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "complete",
      "args": null,
      "storageKey": null
    },
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
      "name": "text",
      "args": null,
      "storageKey": null
    }
  ]
};
(node as any).hash = '1f979eb84ff026fe8a89323dd533d1fc';
export default node;
