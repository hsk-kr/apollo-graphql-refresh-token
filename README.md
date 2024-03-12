# GraphQL Refresh Token Logic Example

![preview](https://github.com/hsk-kr/apollo-graphql-refresh-token/raw/link/preview.gif?raw=true)

Last year, I uploaded a post titled [React Apollo JWT & Refresh Token](https://dev.to/lico/react-apollo-refresh-tokens-5h0k) on [my blog](https://dev.to/lico). Recently, I've got a comment it didn't work that way it was supposed to be.

I was initially planning to asking his code then figure out what the problem was, and I thought there may be a better way to implement it since it was one and half years ago, May 2022 and now when I am currently writing is March 2024.

However, I ended up approaching the same way I did before, using Observable to make a request for refreshToken resolver. I read documentation to find out another way and I implemented the refresh token using `Apollo Link`.

As this is a new approach, I remained the code, which I wrote before, in `master` branch that. I hope someone find it helpful.

## Version

Server: `apollo^4.10.0`

Client: `vite^5.1.4`, `react^18.2.0`, `@apollo/client^3.9.5`

## How to Start Dev Server Using Docker Compose

```properties
docker compose up
```

and then, you can access the GraphQL dev tool by http://localhost:4000 and the client by http://localhost:5173.

---

---

# [Dev.to Post](https://dev.to/lico/react-apollo-jwt-refresh-token-logic-implementation-using-apollolink-2024-o1p)

![apollo JWT Refresh Token Post](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/mvwwmb3yh3sbvyf0c4cv.png)

In early 2022, I worked on a React project with GraphQL at my company. It was my first time using GraphQL and, it was also my last time. I uploaded a post titled [React Apollo: JWT & Refresh Token](https://dev.to/lico/react-apollo-refresh-tokens-5h0k), one of my most-views posts. A couple of weeks ago, someone commented on the post(thank you Andrew) that a part of the code written on my post doesn't work as expected.

Since it has been a long time since I used GraphQL, almost two years ago, I couldn't give a clear answer for that. I just assumed that it may not have worked because something had changed in the latest version of `Apollo` or just logic.

I replied I would go over the code if they gave me the code that had the problem. But then, I thought that it would be better to write the new version of the post about refreshing a token and I also wondered how it could be implemented in the latest version, there may not changes about it though. I started a new project from scratch. It was also good to brush up on what I learned before.

I read Apollo documentation and set up a project by following the step-by-step guide on the docs. The documentation is well-written and has rich content. I reimplemented the logic to refresh a token. However, I ended up reaching the same solution I did before.

We can catch the `Unauthorized` error using the `onError` link. We can not apply `await` to the function that passes to `onError` as it can not return `Promise`. However, to fetch a new access token from the server, we need to request and get a response from the server and the process is going asynchronously.

![refresh token code](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/7yeapuikec8u0d8hjkrc.png)

This code is what I found and wrote in my previous post. It returns an instance that is created from Observable. In the function of Observable, we can call forward an operation using `forward(operation).subscribe` Since it is called from the function that is passed to the constructor of Observable, it means we can call it asynchronously. So, inside the function, I defined a function with the `async` keyword and called `forward.subscribe` in it.

However, I used it without fully understanding.
As I found the same solution, I planned to dig into it more deeply. But then I found something in the `ApolloLink` section in the documentation.

It seemed like in other links, we could process the logic using `Promise` and I came up with the idea that processes asynchronous logic in the next link after `onError`. I tried it and it worked. In this post, I am going to share this implementation.

**Contents**

- [Server Code](#server-code)
- [Client Code](#client-code)
- [Wrap Up](#wrap-up)

---

# Server Code

```typescript
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { GraphQLError } from 'graphql';
import jwt from 'jsonwebtoken';

const typeDefs = `
  type Auth {
    accessToken: String!
    refreshToken: String!
  }

  type RefreshTokenResponse {
    accessToken: String!
  }

  type Query {
    ping: String!
  }

  type Mutation {
    signIn: Auth!
    refreshToken(token: String!): RefreshTokenResponse!
  }
`;

const secretKey = {
  accessToken: 'secret-key-a',
  refreshToken: 'secret-key-b',
};

const tokenExpireDateTime = {
  accessToken: '5s',
  refreshToken: '1d',
};

type User = {
  id: number;
};

type TokenType = 'accessToken' | 'refreshToken';

const generateToken = (user: User, type: TokenType) => {
  return jwt.sign(user, secretKey[type], {
    algorithm: 'HS256',
    expiresIn: tokenExpireDateTime[type],
  });
};

const verifyToken = async (token: string, type: TokenType): Promise<User> => {
  const decoded = await jwt.verify(token, secretKey[type]);
  return { id: (decoded as User)?.id };
};

const authResolver = (resolver) => {
  return (...args) => {
    const { user } = args[2];
    if (!user) {
      throw new GraphQLError('User is not authenticated', {
        extensions: {
          code: 'UNAUTHENTICATED',
          http: { status: 401 },
        },
      });
    }

    return resolver(...args);
  };
};

const refreshToken = async (_, { token }: { token: string }) => {
  try {
    const user = await verifyToken(token, 'refreshToken');
    const accessToken = generateToken(user, 'accessToken');

    return { accessToken };
  } catch {
    throw new GraphQLError('User is not authenticated', {
      extensions: {
        code: 'UNAUTHENTICATED',
        http: { status: 401 },
      },
    });
  }
};

const signIn = () => {
  const user = { id: Math.random() };
  const accessToken = generateToken(user, 'accessToken');
  const refreshToken = generateToken(user, 'refreshToken');

  return {
    accessToken,
    refreshToken,
  };
};

const ping = () => {
  return 'ok';
};

const resolvers = {
  Query: {
    ping: authResolver(ping),
  },
  Mutation: {
    refreshToken,
    signIn,
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => {
    const authorization = req.headers.authorization || '';
    const token = authorization.substring('Bearer '.length);

    try {
      const user = await verifyToken(token, 'accessToken');
      return { user };
    } catch {
      return {};
    }
  },
});

console.log(`Server ready at: ${url}`);
```

---

### Type Definition

```typescript
const typeDefs = `
  type Auth {
    accessToken: String!
    refreshToken: String!
  }

  type RefreshTokenResponse {
    accessToken: String!
  }

  type Query {
    ping: String!
  }

  type Mutation {
    signIn: Auth!
    refreshToken(token: String!): RefreshTokenResponse!
  }
`;
```

there are two types used as a response type. `Auth` and `RefreshTokenResponse`.

`signIn` mutation returns `Auth` that has two properties `accessToken` and `refreshToken`.

`refreshToken` mutation receives a refresh token as a parameter, and will verify it then will return a new `accessToken`. It could've been replaced with `String!` but having a JSON result for this function seemed natural to me, so I defined the type.

`ping` query is used to check whether the access token is verified or not. A middleware will work for the verification. It will be discussed below in the middleware section.

---

### Token (JWT)

```typescript
const secretKey = {
  accessToken: 'secret-key-a',
  refreshToken: 'secret-key-b',
};

const tokenExpireDateTime = {
  accessToken: '5s',
  refreshToken: '1d',
};

type User = {
  id: number;
};

type TokenType = 'accessToken' | 'refreshToken';

const generateToken = (user: User, type: TokenType) => {
  return jwt.sign(user, secretKey[type], {
    algorithm: 'HS256',
    expiresIn: tokenExpireDateTime[type],
  });
};

const verifyToken = async (token: string, type: TokenType): Promise<User> => {
  const decoded = await jwt.verify(token, secretKey[type]);
  return { id: (decoded as User)?.id };
};
```

I used a different secret key to generate and verify the access token and the refresh token. I gave a 5-second expiration time to the access token to ease the test process. The data, id, is not necessary I just put it a random number.

---

### Resolver

```typescript
const authResolver = (resolver) => {
  return (...args) => {
    const { user } = args[2];
    if (!user) {
      throw new GraphQLError('User is not authenticated', {
        extensions: {
          code: 'UNAUTHENTICATED',
          http: { status: 401 },
        },
      });
    }

    return resolver(...args);
  };
};

const refreshToken = async (_, { token }: { token: string }) => {
  try {
    const user = await verifyToken(token, 'refreshToken');
    const accessToken = generateToken(user, 'accessToken');

    return { accessToken };
  } catch {
    throw new GraphQLError('User is not authenticated', {
      extensions: {
        code: 'UNAUTHENTICATED',
        http: { status: 401 },
      },
    });
  }
};

const signIn = () => {
  const user = { id: Math.random() };
  const accessToken = generateToken(user, 'accessToken');
  const refreshToken = generateToken(user, 'refreshToken');

  return {
    accessToken,
    refreshToken,
  };
};

const ping = () => {
  return 'ok';
};

const resolvers = {
  Query: {
    ping: authResolver(ping),
  },
  Mutation: {
    refreshToken,
    signIn,
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});
```

`authResolver` receives a resolver as a parameter and fetches `user` from the context. If `user` exists, it calls the resolver it received as a parameter, which means the token is verified as middleware passes `user` by extracting from the access token. If not, it throws the 401 error.

`refreshToken` verifies the refresh token and if it is verified successfully, it generates a new access token and then returns it, otherwise it returns the 401 error.

`ping` returns a string 'ok'. It exists only for testing of a request.

In resolvers, `ping` is wrapped by `authResolver` and before `ping` is called, `authResolver` will check whether the user is verified or not by checking the `user` data from the context that is passed by middleware.

---

### Middleware (authorization)

```typescript
const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => {
    const authorization = req.headers.authorization || '';
    const token = authorization.substring('Bearer '.length);

    try {
      const user = await verifyToken(token, 'accessToken');
      return { user };
    } catch {
      return {};
    }
  },
});

console.log(`Server ready at: ${url}`);
```

`startStandaloneServer` receives [the context function](https://www.apollographql.com/docs/apollo-server/data/context/#the-context-function) as an optional parameter.

The context function extracts the `authorization` field from the header and verifies it by using `verifyToken` then will pass the user, if it fails it returns an empty JSON object, which means if the user is passed, the token is verified.

---

# Client Code

## UI

![Client UI Design](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/tdxz09xg18jngdbn4kjb.png)

```typescript
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
```

---

### Ping Component

```typescript
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

// ...

<button
  type="button"
  className="py-2 px-4 bg-rose-800 text-white rounded font-bold transition-all hover:bg-rose-700"
  onClick={() => ping()}
>
  Ping
</button>;
```

As `ping` doesn't need to be called when a component is loaded, it is called by `useLazyQuery`. When the button is clicked, it requests the query. Since we don't need to use cache, `network-only` is used as fetch policy.

---

### AuthDisplay Component

```typescript
const SIGNIN = gql`
    mutation SignIn {
      signIn {
        accessToken
        refreshToken
      }
    }
  `;
//...
const [signIn, { data }] = useMutation(SIGNIN);
  }, [data]);
//...
useEffect(() => {
    if (!data?.signIn) return;

    localStorage.setItem('accessToken', data.signIn.accessToken);
    localStorage.setItem('refreshToken', data.signIn.refreshToken);

    updateToken();
  }, [data]);
//...
const updateToken = () => {
    const accessToken = localStorage.getItem('accessToken') ?? '';
    const refreshToken = localStorage.getItem('refreshToken') ?? '';

    setTokens({ accessToken, refreshToken });
  };
```

When the login button is clicked, it requests the `signIn` mutation. As it gets a response from the server, the data will be changed.
`useEffect` detects the `data` changes and sets `accessToken` and `refreshToken` from the storage to the data received from the server.
`updateToken` sets the state inside the component to display the tokens to users.

---

## Apollo

![Link Explanation with the image](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/4knvv30p8xa8qcw37bfb.png)

```typescript
const generateRefreshTokenLinkOnUnauthError = ({
  refreshTokenPathName,
  refreshTokenRequestFunc,
}: {
  refreshTokenPathName: string;
  refreshTokenRequestFunc: () => Promise<void>;
}) => {
  return [
    onError(({ graphQLErrors, operation, forward }) => {
      if (!graphQLErrors) return;

      for (const { path, extensions } of graphQLErrors) {
        if (extensions.code !== 'UNAUTHENTICATED' || !path) continue;
        if (path.includes(refreshTokenPathName)) break;

        const { getContext, setContext } = operation;
        const context = getContext();

        setContext({
          ...context,
          headers: {
            ...context?.headers,
            _needsRefresh: true,
          },
        });

        return forward(operation);
      }
    }),
    setContext(async (_, previousContext) => {
      if (previousContext?.headers?._needsRefresh) {
        await refreshTokenRequestFunc();
      }

      return previousContext;
    }),
  ];
};

const uri = 'http://localhost:4000';

const httpLink = new HttpLink({ uri });

const authLink = setContext((_, previousContext) => {
  const token = localStorage.getItem('accessToken');

  return {
    ...previousContext,
    headers: {
      ...previousContext?.headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const refreshTokenReq = async () => {
  const refreshToken = localStorage.getItem('refreshToken') || '';

  const response = await client.mutate({
    mutation: gql`
      mutation RefreshToken($token: String!) {
        refreshToken(token: $token) {
          accessToken
        }
      }
    `,
    variables: {
      token: refreshToken,
    },
  });

  const { accessToken } = response.data?.refreshToken || {};
  if (accessToken) localStorage.setItem('accessToken', accessToken);
};

const client = new ApolloClient({
  link: from([
    ...generateRefreshTokenLinkOnUnauthError({
      refreshTokenPathName: 'refreshToken',
      refreshTokenRequestFunc: refreshTokenReq,
    }),
    authLink,
    httpLink,
  ]),
  cache: new InMemoryCache(),
});
```

---

### Error Link

```typescript
onError(({ graphQLErrors, operation, forward }) => {
  if (!graphQLErrors) return;

  for (const { path, extensions } of graphQLErrors) {
    if (extensions.code !== 'UNAUTHENTICATED' || !path) continue;
    if (path.includes(refreshTokenPathName)) break;

    const { getContext, setContext } = operation;
    const context = getContext();

    setContext({
      ...context,
      headers: {
        ...context?.headers,
        _needsRefresh: true,
      },
    });

    return forward(operation);
  }
});
```

It finds the `UNATHENTICATED` error from the `graphQLErrors`.
If the error comes from the request for the refresh token, it ignores it.
If the `UNATHENTICATED` error is found, it puts the flag `_needsRefresh` into the headers in the context and then forwards the operation, which means passing it to the next link.

---

### Refresh Token Link

```typescript
setContext(async (_, previousContext) => {
  if (previousContext?.headers?._needsRefresh) {
    await refreshTokenRequestFunc();
  }

  return previousContext;
});
//...
const refreshTokenReq = async () => {
  const refreshToken = localStorage.getItem('refreshToken') || '';

  const response = await client.mutate({
    mutation: gql`
      mutation RefreshToken($token: String!) {
        refreshToken(token: $token) {
          accessToken
        }
      }
    `,
    variables: {
      token: refreshToken,
    },
  });

  const { accessToken } = response.data?.refreshToken || {};
  if (accessToken) localStorage.setItem('accessToken', accessToken);
};
```

If the flag `_needsRefresh` is found from the context, it calls the `refreshTokenReqeustFunc` function.

The `refreshTokenReq` function is the function that will be passed to the refresh token link.

In the function, it requests the refresh token mutation to the server and updates the access token in the storage with the access token received from the server.

---

### Auth Link

```typescript
const authLink = setContext((_, previousContext) => {
  const token = localStorage.getItem('accessToken');

  return {
    ...previousContext,
    headers: {
      ...previousContext?.headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});
```

`authLink` retrieves the access token from the storage and puts it into the headers.

---

### Apollo Client Link

```typescript
const client = new ApolloClient({
  link: from([
    ...generateRefreshTokenLinkOnUnauthError({
      refreshTokenPathName: 'refreshToken',
      refreshTokenRequestFunc: refreshTokenReq,
    }),
    authLink,
    httpLink,
  ]),
  cache: new InMemoryCache(),
});
```

I defined the `generateRefreshTokenLinkOnUnauthError` function to generate `onError` link and the refresh token link. To use this code in your project, just pass your resolver path name and the function to `generateRefreshTokenLinkOnUnauthError`.

---

# Wrap Up

You can check the test result and the full code from [my github repository](https://github.com/hsk-kr/apollo-graphql-refresh-token/tree/link).

Since the repository I implemented the request token logic using `Observable` received 11 stars, To make this code accessible for the people, I pushed this code to a new branch `link` of the repository. I am really glad that somebody found it helpful. I think this is why people share their experiences in the public. It is genuine enjoyment, right?

Also, although I don't use GraphQL, it was fun to explore the new technology. I hope I find a good place to work soon. I am already excited about the opportunity to learn new things.

I hope you found it helpful as well and Happy Coding!
