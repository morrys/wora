const path = require('path');

const NODE_ENV =
  process.env.NODE_ENV === 'production' ? 'production' : 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const IS_LOCAL = !!process.env.LOCAL;
const PUBLIC_PATH = !IS_PRODUCTION || IS_LOCAL ? '/' : process.env.ASSETS_URL;
//const sharedModule = path.resolve(__dirname, '../shared/');
//const webModule = path.join(__dirname, '../web');
const roots = ['node_modules', path.join(__dirname, 'node_modules'), __dirname];


module.exports = {
  mode: IS_PRODUCTION ? 'production' : 'development',
  bail: IS_PRODUCTION,
  context: __dirname,
  output: {
    path: path.join(__dirname, 'dist'),
    publicPath: PUBLIC_PATH,
  },
  resolve: {
    modules: roots,
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx'],
    /*alias: {
        'shared': sharedModule,
        'web': webModule,
      },*/
  },
  resolveLoader: {
    modules: roots,
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx'],
  },
  resolveLoader: {
    modules: [path.resolve(__dirname, 'node_modules')],
  },
  optimization: {
    noEmitOnErrors: true,
 },
  module: {
    rules: [
        {
            test: /\.mjs$/,
            include: /node_modules/,
            type: "javascript/auto",
          },
      {
        test: /\.tsx?$/,
        include: [path.join(__dirname, 'src')],//[webModule, sharedModule, path.join(__dirname, 'src')],
        exclude: /node_modules/,
        use: {
            loader: 'babel-loader',
            options: {
                presets: ["@babel/typescript", "@babel/preset-react", "@babel/preset-env", "@babel/preset-flow"],
                plugins: [
                  ["relay"],
                    //["relay", { "artifactDirectory": "../shared/__generated__/relay/" }],
                    "@babel/plugin-transform-runtime",
                    "@babel/plugin-proposal-class-properties"
                ],
            }
        }
      },
    ],
  },
};