import { Box, Heading } from '@chakra-ui/layout'
import { withUrqlClient } from 'next-urql'
import { EditDeletePostButtons } from '../../components/EditDeletePostButtons'
import { Layout } from '../../components/Layout'
import { useMeQuery } from '../../generated/graphql'
import { createUrqlClient } from '../../utils/createUrqlClient'
import { useGetPostFromUrl } from '../../utils/useGetPostFromUrl'

const Post = () => {
  const [{ data, error, fetching }] = useGetPostFromUrl()

  const [{ data: meData }] = useMeQuery()

  if (error) return <Layout>{error.message}</Layout>

  if (fetching) return <Layout>loading...</Layout>

  if (!data?.post)
    return (
      <Layout>
        <Box>Could not find post</Box>
      </Layout>
    )

  return (
    <Layout>
      <Heading mb='4'>{data?.post?.title}</Heading>
      <Box>{data?.post?.text}</Box>

      {meData?.me?.id !== data.post.creatorId ? null : (
        <EditDeletePostButtons id={data.post.id} />
      )}
    </Layout>
  )
}

export default withUrqlClient(createUrqlClient, { ssr: true })(Post)
