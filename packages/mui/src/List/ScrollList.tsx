import ScrollViewNative from "react-native-web/dist/exports/ScrollView";
import * as React from 'react';
import styled, { css } from "styled-components";
/*
const prova = styled.div.attrs()

const HighlyDynamicComponent = styled.div.attrs({
    contentContainerStyle: props => ({
      background: props.bg,
      props.center && touchAction: props.center ? 'none' : '',
    })
  })`
  
  `

const styled2 = css

/*
${(props:any) => props.dense && !props.disablePadding ? css`padding-top: 8px;
padding-bottom: 8px; `: !props.disablePadding ? css`
padding-top: 4px; padding-bottom: 4px;` : ""}
${props => !props.scrollEnabled ? "touch-action: none;" : ""}
${props => props.hideScrollbar ? "scrollbar-width: none;" : ""}
${props => props.subheader ? "padding-top: 0px;" : ""}
${props => props.customStyle !== undefined ? props.customStyle : ""}
`;
*/
const ScrollView = (props) => {
    const style:any = {
        listStyle: 'none',
        margin: 0,
        padding: 0,
        position: 'relative',
        paddingTop: '4px',
        paddingBottom: '4px',
    }
    if(props.hideScrollbar) {
        style.touchAction = 'none'
    }
    if(!props.scrollEnabled) {
        style.scrollbarQidth = 'none'
    }
    return <ScrollViewNative contentContainerStyle={style} 
    {...props} />
}

export default ScrollView;