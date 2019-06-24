import { css } from "styled-components";
import { Platform } from "react-native";

const shadows = Array.from({ length: 25 }, (v, k) => createShadow(k));



function createShadow(elevation) {
    if (Platform.OS === 'android') {
        return "elevation: " + elevation;
    }

    if (elevation === 0) {
        return "";
    }

    //calculate iosShadows here
    return css`
        shadowOpacity: ${0.0015 * elevation + 0.18},
        shadowRadius: ${0.54 * elevation},
        shadowOffset: {
          height: ${0.6 * elevation},
        }`;
};

export default shadows;