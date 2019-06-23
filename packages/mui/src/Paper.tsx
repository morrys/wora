import { styledDiv } from "./theme/styled";
import styled from "styled-components";
import shadows from "./theme/shadows";
import * as React from "react";


const Paper = (props: any) => {
    const square = props.square;
    const elevation = props.elevation || 2;
    const customStyle = props.customStyle;
    const Component = styledDiv`
        background-color: white;
        box-shadow: ${shadows[elevation]};
        ${(square) ? "" : "border-radius: 4px;" }
        ${customStyle}
    `;
    return <Component> {props.children} </Component>
}

export default Paper;