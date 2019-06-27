import * as React from "react";
import TypographyMaterial from "@material-ui/core/Typography";
import { TypographyProps } from "./types";

const Typography = (props: TypographyProps) => {
    const { variant , children, align} = props;
    return <TypographyMaterial align={align} variant={variant}>{children}</TypographyMaterial>
}


export default Typography;