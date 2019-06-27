import * as React from 'react';
import { graphql } from 'react-relay';
import { environment, QueryRenderer } from './relay';
import { Loading } from '@wora/mui';
import TodoApp from './components/TodoApp';

const isServer = typeof window === 'undefined'
const App = (props: any) =>
<QueryRenderer
      environment={environment}
      dataFrom={"NETWORK_ONLY"}
      query={graphql`
        query AppQuery($userId: String) {
          user(id: $userId) {
            ...TodoApp_user
          }
        }
      `}
      variables={{
        // Mock authenticated ID that matches database
        userId: 'me',
      }}
      render={({error, props, cached, retry}: any) => {
        console.log('QueryRenderer.render:', { props, error, retry, 
          });
        if (props && props.user) {
          return <TodoApp user={props.user}  retry={retry}/>;
        } else if (error) {
          return <div>{error.message}</div>;
        }
        return <Loading />;
      }}
    />;

export default App;