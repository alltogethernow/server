# Together Server

This is a work in progress GraphQL server that aims to bridge MicroSub and MicroPub clients
to make it easier to develop multi device clients using modern technologies

## Setup

To run this server you first need a MongoDB server running to persist user data.

Then create a `.env` file (or environment variables) with the following variables set:

```
URL=http://localhost:300
MONGO=http://mongodb.url
AUTH_SECRET=authsecret
JWT_SECRET=supersecretjwtsecret
```

The `URL` variable is the frontend url. It is used for the client id options and the auth redirect url.