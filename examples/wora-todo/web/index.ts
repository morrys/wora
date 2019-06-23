import App from '../shared/App'
import * as React from 'react';
import ReactDOM from 'react-dom';

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.render(
    App,
    rootElement,
  );
}