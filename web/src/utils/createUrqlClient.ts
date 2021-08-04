import { dedupExchange, fetchExchange } from 'urql'
import {
  LoginMutation,
  MeQuery,
  MeDocument,
  RegisterMutation,
} from '../generated/graphql'
import { cacheExchange } from '@urql/exchange-graphcache'
import { betterUpdateQuery } from './betterUpdateQuery'

export const createUrqlClient = (ssrExchange: any) => ({
  url: 'http://localhost:4000/graphql',
  fetchOptions: { credentials: 'include' as const },
  exchanges: [
    dedupExchange,
    cacheExchange({
      updates: {
        Mutation: {
          login: (result, _args, cache, info) => {
            betterUpdateQuery<LoginMutation, MeQuery>(
              cache,
              {
                query: MeDocument,
              },
              result,
              (r, q) => {
                if (r.login.errors) {
                  return q
                } else {
                  return {
                    me: r.login.user,
                  }
                }
              }
            )
          },
          register: (result, _args, cache, info) => {
            betterUpdateQuery<RegisterMutation, MeQuery>(
              cache,
              {
                query: MeDocument,
              },
              result,
              (r, q) => {
                if (r.register.errors) {
                  return q
                } else {
                  return {
                    me: r.register.user,
                  }
                }
              }
            )
          },
          logout: (result, _args, cache, info) => {
            betterUpdateQuery<RegisterMutation, MeQuery>(
              cache,
              {
                query: MeDocument,
              },
              result,
              () => ({ me: null })
            )
          },
        },
      },
    }),
    fetchExchange,
  ],
})
