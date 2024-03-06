# GraphQL Refresh Token Logic Example

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
