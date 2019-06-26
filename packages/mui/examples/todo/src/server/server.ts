
require('es6-promise').polyfill();
require('isomorphic-fetch');
import express from 'express';
import graphQLHTTP from 'express-graphql';
import * as path from 'path';
import * as React from 'react';
import AppWeb from '../web/App'
import html from '../web/html'
import { schema } from './data/schema';
import { renderToString } from 'react-dom/server';

const APP_PORT: number = 3000;

/*const compiler: webpack.Compiler = webpack({
  mode: 'development',
  entry: ['whatwg-fetch', path.resolve(__dirname, 'js', 'app.js')],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  output: {
    filename: 'app.js',
    path: '/',
  },
});

const app: any = new WebpackDevServer(compiler, {
  contentBase: '/public/',
  publicPath: '/js/',
  stats: {colors: true},
});
*/

const app = express();

// Serve the Relay app
// Calling webpack() without a callback as 2nd property returns a Compiler object.
// The libdefs don't like it, but it's fine.  $FlowFixMe https://webpack.js.org/api/node/
//const app = express();

// Serve static resources
console.log("directory", path.resolve(__dirname, './public'));
app.use('/public', express.static(path.resolve(__dirname, '../public')));
app.use('/client', express.static(path.resolve(__dirname, '../client')));

// Setup GraphQL endpoint
app.use(
  '/graphql',
  graphQLHTTP({
    schema: schema,
    pretty: true,
  }),
);

app.use('/', async (req: any, res: any) => {
  const appString = renderToString( AppWeb );

  console.log("app", appString)

  res.send(html({
    body: appString,
    title: 'Relay • TodoMVC SSR'
  }));
});

app.listen(APP_PORT, "192.168.1.105", () => {
  console.log(`App is now running on http://localhost:${APP_PORT}`);
});
