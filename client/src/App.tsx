import { useEffect } from 'react';
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  FetchResult,
  ApolloLink,
  useLazyQuery,
  createHttpLink,
  gql,
  useMutation,
  GraphQLRequest,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { setContext } from '@apollo/client/link/context';
import { Observable } from '@apollo/client/utilities';
import styled from '@emotion/styled/macro';
import { GraphQLError } from 'graphql';

/**
 * Types
 */
interface Tokens {
  accessToken: string;
  refreshToken: string;
}

interface AccessToken {
  accessToken: string;
}

/**
 * Queries
 */
const CREATE_TOKEN = gql`
  mutation createToken {
    createToken {
      accessToken
      refreshToken
    }
  }
`;

const REFRESH_TOKEN = gql`
  mutation refreshToken {
    refreshToken {
      accessToken
    }
  }
`;

const PING = gql`
  query ping {
    ping
  }
`;

/**
 * Apollo Setup
 */

function isRefreshRequest(operation: GraphQLRequest) {
  return operation.operationName === 'refreshToken';
}

// Returns accesstoken if opoeration is not a refresh token request
function returnTokenDependingOnOperation(operation: GraphQLRequest) {
  if (isRefreshRequest(operation))
    return localStorage.getItem('refreshToken') || '';
  else return localStorage.getItem('accessToken') || '';
}

const httpLink = createHttpLink({
  uri: 'http://localhost:3000/graphql',
});

const authLink = setContext((operation, { headers }) => {
  let token = returnTokenDependingOnOperation(operation);

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const errorLink = onError(
  ({ graphQLErrors, networkError, operation, forward }) => {
    if (graphQLErrors) {
      for (let err of graphQLErrors) {
        switch (err.extensions.code) {
          case 'UNAUTHENTICATED':
            // ignore 401 error for a refresh request
            if (operation.operationName === 'refreshToken') return;

            const observable = new Observable<FetchResult<Record<string, any>>>(
              (observer) => {
                // used an annonymous function for using an async function
                (async () => {
                  try {
                    const accessToken = await refreshToken();

                    if (!accessToken) {
                      throw new GraphQLError('Empty AccessToken');
                    }

                    // Retry the failed request
                    const subscriber = {
                      next: observer.next.bind(observer),
                      error: observer.error.bind(observer),
                      complete: observer.complete.bind(observer),
                    };

                    forward(operation).subscribe(subscriber);
                  } catch (err) {
                    observer.error(err);
                  }
                })();
              }
            );

            return observable;
        }
      }
    }

    if (networkError) console.log(`[Network error]: ${networkError}`);
  }
);

const client = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});

// Request a refresh token to then stores and returns the accessToken.
const refreshToken = async () => {
  try {
    const refreshResolverResponse = await client.mutate<{
      refreshToken: AccessToken;
    }>({
      mutation: REFRESH_TOKEN,
    });

    const accessToken = refreshResolverResponse.data?.refreshToken.accessToken;
    localStorage.setItem('accessToken', accessToken || '');
    return accessToken;
  } catch (err) {
    localStorage.clear();
    throw err;
  }
};

/**
 * React Components
 */

function App() {
  const [createToken, { data: createTokenData }] = useMutation<{
    createToken: Tokens;
  }>(CREATE_TOKEN);
  const [ping] = useLazyQuery(PING, {
    fetchPolicy: 'network-only',
  });

  const requestToken = () => {
    createToken();
  };

  const sendPing = () => {
    ping();
  };

  useEffect(() => {
    if (!createTokenData) return;

    const { accessToken, refreshToken } = createTokenData.createToken;

    // Save tokens in localStorage
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }, [createTokenData]);

  return (
    <Container>
      <button type="button" onClick={requestToken}>
        login
      </button>
      <button type="button" onClick={sendPing}>
        ping
      </button>
    </Container>
  );
}

function ApolloWrapper() {
  return (
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  );
}

/**
 * Styles
 */

const Container = styled.div`
  display: flex;
  flex-direction: column;
  row-gap: 12px;
  padding: 24px;

  > button {
    width: 200px;
    height: 24px;
  }
`;

export default ApolloWrapper;
