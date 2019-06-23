export type ThemeStyle =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'subtitle1'
  | 'subtitle2'
  | 'body1'
  | 'body2'
  | 'caption'
  | 'button'
  | 'overline';

export type Alignment = 'inherit' | 'left' | 'center' | 'right' | 'justify';
export type Color = 'inherit' | 'primary' | 'secondary' | 'default';
export type Margin = 'none' | 'dense' | 'normal';

export type TypographyProps = {
    variant: ThemeStyle;
    children: any;
    align: Alignment;
}