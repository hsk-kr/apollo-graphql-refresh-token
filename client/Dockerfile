FROM node:18-alpine3.19

WORKDIR /app
COPY . .

RUN npm install -g pnpm
RUN pnpm install

EXPOSE 5173
CMD ["pnpm","run","dev"]