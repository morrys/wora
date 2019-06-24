import { AppRegistry } from 'react-native';
import App from '../shared/App';
import { name } from './app.json';

/**
 * Initialise the javascript application.
 */
AppRegistry.registerComponent(name, () => App);
