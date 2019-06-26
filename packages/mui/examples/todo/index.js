import { AppRegistry } from 'react-native';
import App from './src/shared/App';
import { name } from './app.json';

/**
 * Initialise the javascript application.
 */
AppRegistry.registerComponent(name, () => App);
