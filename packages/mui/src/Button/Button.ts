import * as React from "react";
import Button from "react-native-web/dist/exports/Button";
import styled, { css } from "styled-components";
import palette from "../theme/palette";
import transition from "../theme/transition";
import { fade } from "../theme/manipulator";
import shadows from "../theme/shadows";

export const StyleButtonBase = css`
        display: inline-flex;
        align-items: center;
        justify-content: center;
        position: relative;
        -webkit-tap-highlight-color: transparent;
        background-color: transparent;
        outline: none;
        border: 0;
        margin: 0;
        border-radius: 0;
        padding: 0;
        cursor: pointer;
        user-select: none;
        vertical-align: middle;
        -moz-appearance: none;
        -webkit-appearance: none;
        text-decoration: none;
        color: inherit;
        &::-moz-focus-inner: {
            border-style: none;
        }
        ${(props:any) => props.disabled ? css`
            pointer-events: none;
            cursor: default;
        ` : ""}
        `;

const CssCustom = css`
    ${palette.typobutton}
    float: right;
    margin: 20px 5px;
    border-radius: 4px;
    box-sizing: border-box;
    min-width: 64px;
    min-height: 36px;
    padding: 8px 16px;
    color: ${palette.text.primary};
    ${transition.create(['background-color', 'box-shadow', 'border'], {
      duration: transition.duration.short,
    })}
    &:hover {
      text-decoration: none;
      background-color: ${fade(palette.text.primary, palette.action.hoverOpacity)};
      // Reset on touch devices, it doesn't add specificity
      @media (hover: none) {
        background-color: transparent;
      }
      ${(props:any) => props.disabled ? 'background-color: transparent;': ""}
    }
    ${(props:any) => props.disabled ? 'color: '+palette.action.disabled+";" : ""}
`;



const ContainedCustom = css`
    color: ${(props:any) => props.primary ? palette.text.primary : palette.text.secondary};
    background-color: ${(props:any) => props.primary ? palette.primary.main : palette.secondary.main};
    box-shadow: ${shadows[2]};
    ${(props:any) => props.focusVisible ? "box-shadow:"+ shadows[6] : ""}
    &:active {
        box-shadow: ${shadows[8]};
    }
    ${(props:any) => props.disabled ? css`background-color: ${palette.action.disabled};
    box-shadow: ${shadows[0]};
    color: ${palette.action.disabled};
    ` : ""}
    &:hover {
        background-color: ${(props:any) => props.primary ? palette.primary.dark : palette.secondary.dark};
        // Reset on touch devices, it doesn't add specificity
        @media (hover: none) {
            background-color: ${(props:any) => props.primary ? palette.primary.main : palette.secondary.main};
        }
    }    
`;

const FabCustom = css`
    border-radius: 50%;
    padding: 0;
    min-width: 0;
    width: 56px;
    height: 56px;
    box-shadow: ${shadows[6]};
    &:active {
        box-shadow: ${shadows[12]};
    }
    position: fixed;
    bottom: ${palette.unit * 2}rem;
    right:  ${palette.unit * 2}rem;
`;

const CustomButton = styled(Button)`
        ${StyleButtonBase}
        ${CssCustom}
        ${ContainedCustom}
        ${(props:any) => props.fab !== undefined ? FabCustom : ""}
        ${(props:any) => props.customStyle !== undefined ? props.customStyle : ""}
        
`;





export default CustomButton;