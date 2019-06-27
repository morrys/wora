import { ScrollView as ScrollViewNative } from "react-native";
import * as React from 'react';
import { css } from "styled-components";

const styled = css`
list-style: none;
margin: 0;
padding: 0;
position: relative;
${(props:any) => props.dense && !props.disablePadding ? css`padding-top: 8px;
padding-bottom: 8px; `: !props.disablePadding ? css`
padding-top: 4px; padding-bottom: 4px;` : ""}
${props => !props.scrollEnabled ? "touch-action: none;" : ""}
${props => props.hideScrollbar ? "scrollbar-width: none;" : ""}
${props => props.subheader ? "padding-top: 0px;" : ""}
${props => props.customStyle !== undefined ? props.customStyle : ""}
`;

const ScrollView = (props) => {
    const style:any = {
        listStyle: 'none',
        margin: 0,
        padding: 0,
        position: 'relative',
        paddingTop: 4,
        paddingBottom: 4,
    }
    if(props.hideScrollbar) {
        style.touchAction = 'none'
    }
    if(!props.scrollEnabled) {
        style.scrollbarQidth = 'none'
    }
    return <ScrollViewNative contentContainerStyle={style}  {...props} />
}

export default ScrollView;