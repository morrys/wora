import * as React from "react";
import { Text } from 'react-native';
import { material } from 'react-native-typography';
import { TypographyProps } from "./types";

const variantNativeMapping = {
    h1: 'display4',
    h2: 'display3',
    h3: 'display2',
    h4: 'display1',
    h5: 'headline',
    h6: 'title',
    subtitle1: 'subheading',
    subtitle2: 'subheading',
    overline: 'caption'
  };

const Typography = (props: TypographyProps) => {
    const { variant, children, align } = props;
    const variantNative = variantNativeMapping[variant] || variant;
    return <Text styles={[material[variantNative], {
        textAlign: align
    }]}>{children}</Text>;
}

export default Typography;