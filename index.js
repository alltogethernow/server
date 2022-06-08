require('dotenv').config()
const express = require('express')
const { ApolloServer } = require('apollo-server-express')
const { createServer } = require('http')
const { ApolloServerPluginDrainHttpServer } = require('apollo-server-core')
const { makeExecutableSchema } = require('@graphql-tools/schema')
const { WebSocketServer } = require('ws')
const { useServer } = require('graphql-ws/lib/use/ws')
const typeDefs = require('./schema')
const resolvers = require('./resolvers')
const MicrosubAPI = require('./datasources/microsub')
const MicropubAPI = require('./datasources/micropub')
const IndieAuthAPI = require('./datasources/indieauth')
const MongoAPI = require('./datasources/mongo')
const users = new MongoAPI()

// set up any dataSources our resolvers need
const dataSources = () => ({
  microsub: new MicrosubAPI(),
  micropub: new MicropubAPI(),
  indieauth: new IndieAuthAPI(),
  mongo: users,
})

const context = async ({ req, connection }) => {
  // simple auth check on every request
  if (connection) {
    // check connection for metadata
    return connection.context
  } else {
    try {
      const auth = (req.headers && req.headers.authorization) || ''
      const user = await users.findOrCreateUser(auth)
      return { user }
    } catch (err) {
      return { user: {} }
    }
  }
}

const app = express()
const httpServer = createServer(app)

// Create our WebSocket server using the HTTP server we just set up.
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
})
const schema = makeExecutableSchema({ typeDefs, resolvers })

// Save the returned server's info so we can shutdown this server later
const serverCleanup = useServer({ schema }, wsServer)

const server = new ApolloServer({
  schema,
  dataSources,
  // resolvers,
  context,
  csrfPrevention: true,
  cors: {
    origin: [process.env.URL],
  },
  resolverValidationOptions: {
    requireResolversForResolveType: false,
  },
  subscriptions: {
    onConnect: async (connectionParams, webSocket) => {
      try {
        const auth = (connectionParams && connectionParams.authToken) || ''
        const user = await users.findOrCreateUser(auth)
        console.log('[websocket connect]', user.url)
        return { user }
      } catch (err) {
        return { user: {} }
      }
    },
    // onDisconnect: (webSocket, context) => {
    //   console.log('Socket disconnect')
    // },
  },
  plugins: [
    // Proper shutdown for the HTTP server.
    ApolloServerPluginDrainHttpServer({ httpServer }),

    // Proper shutdown for the WebSocket server.
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose()
          },
        }
      },
    },
  ],
})

const port = process.env.PORT || 4000

server.start(port).then(() => {
  console.log(`🚀 Server started`)
  server.applyMiddleware({ app })
})

// Now that our HTTP server is fully set up, we can listen to it.
httpServer.listen(port, () => {
  console.log(
    `🚀 Http Server ready at http://localhost:${port}${server.graphqlPath}`
  )
})
