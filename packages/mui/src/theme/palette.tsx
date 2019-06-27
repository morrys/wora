import { css } from "styled-components";
import { yellow, indigo, red, pink } from "./color";

const palette = {
    text: {
        // The most important text.
        primary: "red",
        // Secondary text.
        secondary: "blue",
        // Disabled text have even lower visual prominence.
        disabled: "grey",
        // Text hints.
        hint: "pink",
    },
    action: {
        // The color of an active action like an icon button.
        active: "rgba(0, 0, 0, 0.54)",
        // The color of an hovered action.
        hover: "rgba(0, 0, 0, 0.08)",
        hoverOpacity: 0.08,
        // The color of a selected action.
        selected: "rgba(0, 0, 0, 0.14)",
        // The color of a disabled action.
        disabled: "rgba(0, 0, 0, 0.26)",
        // The background color of a disabled action.
        disabledBackground: "rgba(0, 0, 0, 0.12)",
    },
    typobutton: function(colorcontrast= false) { return css`
        ${palette.font};
        font-size: ${palette.unit * 0.875}rem;
        text-transform: uppercase;
        font-weight: 500;
        color: ${palette.text.primary};
        ${(colorcontrast) ? "opacity: .87;": ""}`;}
    ,
    font: "font-family: Roboto, Helvetica, Arial, sans-serif",
    unit: 1,
    primary: {
        light: yellow[500],
        main: yellow[700],
        dark: yellow[900],
    },
    secondary: {
        light: indigo[500],
        main: indigo[700],
        dark: indigo[900],
    },
    accent: {
        light: pink.A200,
        main: pink.A400,
        dark: pink.A700,
    },
    error: {
        light: red[300],
        main: red[500],
        dark: red[700],
    },
}



export default palette;