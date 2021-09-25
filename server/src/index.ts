import { MikroORM } from '@mikro-orm/core'
import { __prod__, PORT, COOKIE_NAME } from './constants'
import microConfig from './mikro-orm.config'
import express from 'express'
import Redis from 'ioredis'
import connectRedis from 'connect-redis'
import session from 'express-session'
import { ApolloServer } from 'apollo-server-express'
import { buildSchema } from 'type-graphql'
import { HelloResolver } from './resolvers/hello'
import { PostResolver } from './resolvers/post'
import { UserResolver } from './resolvers/user'
import { MyContext } from './types'
import cors from 'cors'
import { sendEmail } from './utils/sendEmail'

const main = async () => {
  sendEmail('bob@bob.com', 'Oh hello there')
  const orm = await MikroORM.init(microConfig)
  await orm.getMigrator().up()

  const RedisStore = connectRedis(session)
  const redis = new Redis()

  const app = express()

  app.use(
    cors({
      origin: 'http://localhost:3000',
      credentials: true,
    })
  )

  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redis,
        disableTouch: true,
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
      },
      saveUninitialized: false,
      secret: 'paska',
      resave: false,
    })
  )

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }): MyContext => ({ em: orm.em, req, res, redis }),
  })

  apolloServer.applyMiddleware({
    app,
    cors: false,
  })

  app.listen(PORT, () => {
    console.log(`server started on localhost:${PORT}`)
  })
}

main().catch(err => console.error(err))
