const nodeExternals = require('webpack-node-externals');
const webpackMerge = require('webpack-merge');
const commonWebpackConfig = require('./webpack.common.js');

module.exports = webpackMerge(commonWebpackConfig, {
  name: 'server',
  target: 'node',
  node: {
    __dirname: false
},
  entry: ['./src/server/server.ts'],
  output: {
    filename: 'server/[name].js',
    sourceMapFilename: 'server/[name].map.js',
  },
  /*externals: [
    nodeExternals({
      modulesDir: 'node_modules',
      whitelist: [/\.css$/],
    }),
  ],*/
});