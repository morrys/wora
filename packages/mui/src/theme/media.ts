// Sorted ASC by size. That"s important.
// It can"t be configured as it"s used statically for propTypes.
export const keys = ["xs", "sm", "m", "md", "lg", "xl"];

// Keep in mind that @media is inclusive by the CSS specification.
export default class Media {

    // The breakpoint **start** at this value.
    // For instance with the first breakpoint xs: [xs, sm[.
    static  values = {
        xxs: 0,
        xs: 350,
        sm: 600,
        m: 750,
        md: 960,
        lg: 1280,
        xl: 1920,
    };
    static  unit = "px";
    static  step = 5;
    static down(key) {
        const endIndex = keys.indexOf(key) + 1;
        const upperbound = this.values[keys[endIndex]];

        if (endIndex === keys.length) {
            // xl down applies to all sizes
            return  this.up("xs");
        }

        const value = typeof upperbound === "number" && endIndex > 0 ? upperbound : key;
        return "@media (max-width:"+(value -  this.step / 100)+this.unit+")";
    }

    static  between(start, end) {
        const endIndex = keys.indexOf(end) + 1;

        if (endIndex === keys.length) {
            return  this.up(start);
        }

        return (
            "@media (min-width:"+this.values[start]+this.unit+") and " +
            "(max-width:"+(this.values[keys[endIndex]] -  this.step / 100)+ this.unit+")"
        );
    }

    static   only(key) {
        return this.between(key, key);
    }

    static  width(key) {
        return  this.values[key];
    }

    static  up(key) {
        const value = typeof  this.values[key] === "number" ?  this.values[key] : key;
        return "@media (min-width:"+value+this.unit+")";
    }
}