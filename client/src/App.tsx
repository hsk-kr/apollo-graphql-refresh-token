import { useEffect, useState } from 'react';
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  gql,
  useLazyQuery,
  useMutation,
  HttpLink,
  from,
  DocumentNode,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { setContext } from '@apollo/client/link/context';
import './App.css';

/**
 * Apollo w/Apollo Links
 */

const generateRefreshTokenLinkOnUnauthError = <RT,>({
  getRefreshTokenFunc,
  refreshTokenGql,
  refreshTokenPathName,
  removeRefreshTokenFunc,
  updateAccessToken,
}: {
  refreshTokenPathName: string;
  refreshTokenGql: DocumentNode;
  getRefreshTokenFunc: () => string;
  removeRefreshTokenFunc: VoidFunction;
  updateAccessToken: (data: RT | null | undefined) => void;
}) => {
  return [
    onError(({ graphQLErrors, operation, forward }) => {
      if (graphQLErrors) {
        for (const graphQLError of graphQLErrors) {
          const { path, extensions } = graphQLError;
          if (extensions.code === 'UNAUTHENTICATED') {
            if (path?.includes(refreshTokenPathName)) {
              return;
            }

            const { getContext, setContext } = operation;
            const refreshTokenExists = getRefreshTokenFunc();
            if (refreshTokenExists) {
              setContext({
                ...getContext(),
                headers: {
                  _needsRefresh: true,
                },
              });

              return forward(operation);
            }
          }
        }
      }
    }),
    setContext(async (_, previousContext) => {
      if (previousContext?.headers?._needsRefresh) {
        const refreshToken = getRefreshTokenFunc();

        try {
          const response = await client.mutate<RT>({
            mutation: refreshTokenGql,
            variables: {
              token: refreshToken,
            },
          });

          updateAccessToken(response.data);
        } catch {
          removeRefreshTokenFunc();
        }
      }

      return previousContext;
    }),
  ];
};

const uri = 'http://localhost:4000';

const httpLink = new HttpLink({ uri });

const authLink = setContext((_, previousContext) => {
  const token = localStorage.getItem('accessToken') ?? '';

  return {
    ...previousContext,
    headers: {
      ...previousContext?.headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

/**
 * React Components
 */

const client = new ApolloClient({
  link: from([
    ...generateRefreshTokenLinkOnUnauthError<{
      refreshToken: { accessToken: string };
    }>({
      getRefreshTokenFunc: () => localStorage.getItem('refreshToken') ?? '',
      refreshTokenGql: gql`
        mutation RefreshToken($token: String!) {
          refreshToken(token: $token) {
            accessToken
          }
        }
      `,
      refreshTokenPathName: 'refreshToken',
      removeRefreshTokenFunc: () => localStorage.removeItem('refreshToken'),
      updateAccessToken: (data) => {
        const { accessToken } = data?.refreshToken || {};
        if (accessToken) localStorage.setItem('accessToken', accessToken);
      },
    }),
    authLink,
    httpLink,
  ]),
  cache: new InMemoryCache(),
});

function AuthDisplay() {
  const SIGNIN = gql`
    mutation SignIn {
      signIn {
        accessToken
        refreshToken
      }
    }
  `;

  const [tokens, setTokens] = useState<
    | {
        accessToken: string;
        refreshToken: string;
      }
    | undefined
  >();

  const updateToken = () => {
    const accessToken = localStorage.getItem('accessToken') ?? '';
    const refreshToken = localStorage.getItem('refreshToken') ?? '';

    setTokens({ accessToken, refreshToken });
  };

  const [signIn, { data }] = useMutation(SIGNIN);

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    updateToken();
  };

  useEffect(() => {
    updateToken();

    const tmShowToken = setInterval(updateToken, 1000);

    return () => {
      clearInterval(tmShowToken);
    };
  }, []);

  useEffect(() => {
    if (!data?.signIn) return;

    localStorage.setItem('accessToken', data.signIn.accessToken);
    localStorage.setItem('refreshToken', data.signIn.refreshToken);
    updateToken();
  }, [data]);

  return (
    <div className="bg-white p-2 rounded">
      <div className="flex gap-x-2 flex-wrap mb-2">
        <div className="flex gap-x-2">
          <label className="font-bold">accessToken</label>
          <p className="max-w-60 break-words text-sm">{tokens?.accessToken}</p>
        </div>
        <div className="flex gap-x-2">
          <label className="font-bold">refreshToken</label>
          <p className="max-w-60 break-words text-sm">{tokens?.refreshToken}</p>
        </div>
      </div>
      <div className="flex gap-x-2">
        <button
          type="button"
          className="py-2 px-4 bg-sky-800 text-white rounded font-bold transition-all hover:bg-sky-700"
          onClick={() => signIn()}
        >
          Sign In
        </button>
        <button
          type="button"
          className="py-2 px-4 bg-orange-600 text-white rounded font-bold transition-all hover:bg-orange-500"
          onClick={logout}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

function Ping() {
  const PING = gql`
    query Ping {
      ping
    }
  `;
  const [ping, { error }] = useLazyQuery(PING, {
    fetchPolicy: 'network-only',
    onCompleted: () => setStatus('success'),
    onError: () => setStatus('error'),
  });
  const [status, setStatus] = useState('');

  return (
    <div className="p-2 bg-white rounded">
      <div className="mb-2">
        <label className="uppercase font-bold">ping result: </label>
        {status && (
          <span
            className={`${
              error ? 'bg-red-600' : 'bg-green-600'
            } text-white py-1 px-2 rounded w-fit font-bold text-sm`}
          >
            {status}
          </span>
        )}
      </div>
      <button
        type="button"
        className="py-2 px-4 bg-rose-800 text-white rounded font-bold transition-all hover:bg-rose-700"
        onClick={() => ping()}
      >
        Ping
      </button>
    </div>
  );
}

function App() {
  return (
    <ApolloProvider client={client}>
      <div className="w-screen h-screen bg-slate-900 p-4">
        <AuthDisplay />
        <div className="h-4" />
        <Ping />
      </div>
    </ApolloProvider>
  );
}

export default App;
