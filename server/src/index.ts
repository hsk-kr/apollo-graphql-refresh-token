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
