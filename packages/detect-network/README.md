# [@wora/detect-network](https://github.com/morrys/wora)

## React

Install @wora/detect-network using yarn or npm:

```
yarn add @wora/detect-network
```

```ts
import { NetInfo } from "@wora/detect-network";
import { useIsConnected } from "@wora/detect-network";
import { useNetInfo } from "@wora/detect-network";
```


## React Native ([react-native-community/react-native-netinfo](https://github.com/react-native-community/react-native-netinfo/blob/master/README.md))

Install @wora/detect-network using yarn or npm:

```
yarn add @wora/detect-network react-native @react-native-community/netinfo
```

You then need to link the native parts of the library for the platforms you are using. The easiest way to link the library is using the CLI tool by running this command from the root of your project:

`react-native link @react-native-community/netinfo`


```ts
import { NetInfo } from "@wora/detect-network";
import { useIsConnected } from "@wora/detect-network";
import { useNetInfo } from "@wora/detect-network";
```


## React Native

Install @wora/detect-network using yarn or npm:

```
yarn add @wora/detect-network react-native
```

```ts
import { NetInfo } from "@wora/detect-network/lib/deprecated";
import { useIsConnected } from "@wora/detect-network/lib/deprecated";
import { useNetInfo } from "@wora/detect-network/lib/deprecated";
```

## Example

```ts
const isConnected: boolean = useIsConnected();
const netInfo = useNetInfo();
```
