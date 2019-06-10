#[wora detect-network](https://github.com/morrys/react-relay-offline)

## Installation

Install @wora/detect-network using yarn or npm:

```
yarn add @wora/detect-network
```

## React Native

[react-native-community/react-native-netinfo](https://github.com/react-native-community/react-native-netinfo/blob/master/README.md)

then

```ts
import { NetInfo } from "@wora/detect-network";
import { useIsConnected } from "@wora/detect-network";
import { useNetInfo } from "@wora/detect-network";
```


## React

```ts
import { NetInfo } from "@wora/detect-network";
import { useIsConnected } from "@wora/detect-network";
import { useNetInfo } from "@wora/detect-network";
```

## React Native (deprecated)

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