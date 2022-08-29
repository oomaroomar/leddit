import {
  dedupExchange,
  fetchExchange,
  Exchange,
  stringifyVariables,
  gql,
} from 'urql'
import {
  LoginMutation,
  MeQuery,
  MeDocument,
  RegisterMutation,
  VoteMutationVariables,
  DeletePostMutationVariables,
} from '../generated/graphql'
import { pipe, tap } from 'wonka'
import { cacheExchange, Resolver } from '@urql/exchange-graphcache'
import { betterUpdateQuery } from './betterUpdateQuery'
import Router from 'next/router'
import { isServer } from './isServer'

const errorExchange: Exchange =
  ({ forward }) =>
  ops$ => {
    return pipe(
      forward(ops$),
      tap(({ error }) => {
        if (error?.message.includes('not authenticated')) {
          Router.replace('/login')
        }
      })
    )
  }

const cursorPagination = (): Resolver => {
  return (_parent, fieldArgs, cache, info) => {
    const { parentKey: entityKey, fieldName } = info
    const allFields = cache.inspectFields(entityKey)
    const fieldInfos = allFields.filter(info => info.fieldName === fieldName)
    const size = fieldInfos.length
    if (size === 0) {
      return undefined
    }

    const fieldKey = `${fieldName}(${stringifyVariables(fieldArgs)})`
    const isItInTheCache = cache.resolve(entityKey, fieldKey)
    info.partial = !isItInTheCache

    const results: string[] = []
    let hasMore = true
    fieldInfos.forEach(fi => {
      const key = cache.resolve(entityKey, fi.fieldKey) as string
      const data = cache.resolve(key, 'posts') as string[]
      const _hasMore = cache.resolve(key, 'hasMore')
      if (!_hasMore) {
        hasMore = false
      }
      results.push(...data)
    })

    return {
      posts: results,
      hasMore,
      __typename: 'PaginatedPosts',
    }

    //     const links = cache.resolve(entityKey, fieldKey) as string[]
  }
}

export const createUrqlClient = (ssrExchange: any, ctx) => {
  let cookie = ''

  if (isServer()) {
    cookie = ctx.req.headers.cookie
  }

  return {
    url: 'http://localhost:4000/graphql',
    fetchOptions: {
      credentials: 'include' as const,
      headers: cookie ? { cookie } : undefined,
    },
    exchanges: [
      dedupExchange,
      cacheExchange({
        resolvers: {
          Query: {
            posts: cursorPagination(),
          },
        },
        updates: {
          Mutation: {
            deletePost: (_result, args, cache, _info) => {
              cache.invalidate({
                __typename: 'Post',
                id: (args as DeletePostMutationVariables).id,
              })
            },
            vote: (_result, args, cache, _info) => {
              const { postId, value } = args as VoteMutationVariables
              const data = cache.readFragment(
                gql`
                  fragment _ on Post {
                    id
                    points
                    voteStatus
                  }
                `,
                { id: postId }
              )
              if (data) {
                if (data.voteStatus === value) return
                const newPoints =
                  data.points + (!data.voteStatus ? 1 : 2) * value
                cache.writeFragment(
                  gql`
                    fragment _ on Post {
                      points
                      voteStatus
                    }
                  `,
                  { id: postId, points: newPoints, voteStatus: value }
                )
              }
            },
            createPost: (_result, _args, cache, _info) => {
              const allFields = cache.inspectFields('Query')
              const fieldInfos = allFields.filter(
                info => info.fieldName === 'posts'
              )
              fieldInfos.forEach(fi =>
                cache.invalidate('Query', 'posts', fi.arguments)
              )
            },
            login: (result, _args, cache, _info) => {
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
            register: (result, _args, cache, _info) => {
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
            logout: (result, _args, cache, _info) => {
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
      errorExchange,
      ssrExchange,
      fetchExchange,
    ],
  }
}
