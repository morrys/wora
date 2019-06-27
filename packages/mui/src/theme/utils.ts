const fontSize = 14; // px
const htmlFontSize = 16;

const coef = fontSize / 14;

export function pxToRem(value) {
    return `${(value / htmlFontSize) * coef}rem`;
}