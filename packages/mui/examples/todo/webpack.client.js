const TerserPlugin = require('terser-webpack-plugin');
const webpackMerge = require('webpack-merge');
const commonWebpackConfig = require('./webpack.common.js');
const NODE_ENV =
  process.env.NODE_ENV === 'production' ? 'production' : 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const IS_MONITOR = !!process.env.MONITOR;

const stripUselessLoaderOptions = value => value || undefined;

module.exports = webpackMerge(commonWebpackConfig, {
    name: 'client',
    target: 'web',
    entry: ['./src/web/index.ts'],
    output: {
      filename: 'client/[name].js',
      sourceMapFilename: 'client/[name].map.js',
      chunkFilename: 'client/chunks/[name].chunk.js',
    },
    optimization: {
      runtimeChunk: 'single',
      minimizer: stripUselessLoaderOptions(
        IS_PRODUCTION && [
          new TerserPlugin({
            cache: true,
            parallel: true,
          }),
        ],
      ),
    },
  });