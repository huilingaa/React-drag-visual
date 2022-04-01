import dva from 'dva';
import { Component } from 'react';
import createLoading from 'dva-loading';
import history from '@tmp/history';

let app = null;

export function _onCreate() {
  const plugins = require('umi/_runtimePlugin');
  const runtimeDva = plugins.mergeConfig('dva');
  app = dva({
    history,
    
    ...(runtimeDva.config || {}),
    ...(window.g_useSSR ? { initialState: window.g_initialData } : {}),
  });
  
  app.use(createLoading());
  (runtimeDva.plugins || []).forEach(plugin => {
    app.use(plugin);
  });
  
  app.model({ namespace: 'application', ...(require('C:/Users/86156/Desktop/react-drag-master/src/models/application.js').default) });
app.model({ namespace: 'components', ...(require('C:/Users/86156/Desktop/react-drag-master/src/models/components.js').default) });
app.model({ namespace: 'drag', ...(require('C:/Users/86156/Desktop/react-drag-master/src/models/drag.js').default) });
app.model({ namespace: 'login', ...(require('C:/Users/86156/Desktop/react-drag-master/src/models/login.js').default) });
app.model({ namespace: 'orginzation', ...(require('C:/Users/86156/Desktop/react-drag-master/src/models/orginzation.js').default) });
  return app;
}

export function getApp() {
  return app;
}

export class _DvaContainer extends Component {
  render() {
    const app = getApp();
    app.router(() => this.props.children);
    return app.start()();
  }
}
