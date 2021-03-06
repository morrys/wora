---
id: detect-network
title: Detect Network
---

# [@wora/detect-network](https://github.com/morrys/wora)

simple library that implements the **react-native useNetInfo hook** to use it also in the **web**

it is possible to use the **useIsConnected hook** with the only information if the network status is online or offline for both **react-native and web**

I opened an [issue](https://github.com/react-native-community/react-native-netinfo/issues/160) to request to implement useIsConnected inside the react-native-community/react-native-netinfo library



## React

Install @wora/detect-network using yarn or npm:

```
yarn add @wora/detect-network
```

```ts
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
import { useIsConnected } from "@wora/detect-network";
import { useNetInfo } from "@wora/detect-network";
```

## Example

```ts
const isConnected: boolean = useIsConnected();
const netInfo = useNetInfo();
```
