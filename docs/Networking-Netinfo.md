---
id: netinfo
title: NetInfo
---

# [@wora/netinfo](https://github.com/morrys/wora)


### NetInfo.addEventListener

Allows you to **subscribe** to the **connection change event**. The **callback** function passed as a parameter will be ****executed whenever the connection information changes**

The return parameter **is function** to be invoked when you want to **unsubscribe**

### NetInfo.fetch

Return a `Promise` with the connection information.


## React

Install @wora/netinfo using yarn or npm:

```
yarn add @wora/netinfo
```

```ts
import { NetInfo } from "@wora/netinfo";
```


## React Native ([react-native-community/react-native-netinfo](https://github.com/react-native-community/react-native-netinfo/blob/master/README.md))

Install @wora/netinfo using yarn or npm:

```
yarn add @wora/netinfo react-native @react-native-community/netinfo
```

You then need to link the native parts of the library for the platforms you are using. The easiest way to link the library is using the CLI tool by running this command from the root of your project:

`react-native link @react-native-community/netinfo`


```ts
import { NetInfo } from "@wora/netinfo";
```

