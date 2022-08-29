import React, { useState } from 'react'
import { withUrqlClient } from 'next-urql'
import { createUrqlClient } from '../utils/createUrqlClient'
import { useMeQuery, usePostsQuery } from '../generated/graphql'
import { Layout } from '../components/Layout'
import { Box, Flex, Heading, Link, Stack, Text } from '@chakra-ui/layout'
import NextLink from 'next/link'
import { Button } from '@chakra-ui/button'
import { UpvoteSection } from '../components/UpvoteSection'
import { EditDeletePostButtons } from '../components/EditDeletePostButtons'

const Index = () => {
  const [variables, setVariables] = useState({
    limit: 15,
    cursor: null as string | null,
  })
  const [{ data, fetching }] = usePostsQuery({
    variables,
  })

  const [{ data: meData }] = useMeQuery()

  if (!fetching && !data) {
    return <div>something went wrong</div>
  }

  return (
    <Layout>
      {fetching && !data ? (
        <div>loading...</div>
      ) : (
        <Stack spacing={4}>
          {data!.posts.posts.map(p =>
            !p ? null : (
              <Flex key={p.id} p={5} shadow='md' borderWidth='1px'>
                <UpvoteSection post={p} />
                <Box>
                  <NextLink href='/post/[id]' as={`/post/${p.id}`}>
                    <Link>
                      <Heading fontSize='xl'>{p.title}</Heading>
                    </Link>
                  </NextLink>
                  <Text mt={2}> by {p.creator.username}</Text>
                  <Text mt={2}>{p.textSnippet}</Text>
                </Box>
                {meData?.me?.id !== p.creatorId ? null : (
                  <EditDeletePostButtons id={p.id} />
                )}
              </Flex>
            )
          )}
        </Stack>
      )}
      {data && data.posts.hasMore ? (
        <Flex align='center' justify='center'>
          <Button
            onClick={() => {
              setVariables({
                limit: variables.limit,
                cursor: data.posts.posts[data.posts.posts.length - 1].createdAt,
              })
            }}
            isLoading={fetching}
            my='8'
          >
            Load More
          </Button>
        </Flex>
      ) : null}
    </Layout>
  )
}

export default withUrqlClient(createUrqlClient, { ssr: true })(Index)
