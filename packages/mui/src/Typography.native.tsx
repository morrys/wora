import * as React from "react";
import { Text } from 'react-native';
import { material } from 'react-native-typography';
import { TypographyProps } from "./types";


const Typography = (props: TypographyProps) => {
    const { variant, children, align } = props;
    return <Text styles={[material[variant], {
        textAlign: align
    }]}>{children}</Text>;
}

export default Typography;