import { Box, Button } from '@chakra-ui/react'
import { Formik, Form } from 'formik'
import { withUrqlClient } from 'next-urql'
import { useRouter } from 'next/router'
import React from 'react'
import { InputField } from '../../../components/InputField'
import { Layout } from '../../../components/Layout'
import { usePostQuery, useUpdatePostMutation } from '../../../generated/graphql'
import { createUrqlClient } from '../../../utils/createUrqlClient'
import { useGetIntId } from '../../../utils/useGetIntId'

const EditPost = ({}) => {
  const router = useRouter()
  const intId = useGetIntId()
  const [{ data, fetching }] = usePostQuery({
    pause: intId === -1,
    variables: {
      id: intId,
    },
  })

  const [, updatePost] = useUpdatePostMutation()
  if (fetching) {
    return (
      <Layout>
        <Box>loading...</Box>
      </Layout>
    )
  }

  if (!data?.post)
    return (
      <Layout>
        <Box>Could not find post</Box>
      </Layout>
    )

  return (
    <Layout>
      <Formik
        initialValues={{ title: data.post.title, text: data.post.text }}
        onSubmit={async values => {
          const { error } = await updatePost({
            ...values,
            id: intId,
          })
          if (!error) {
            router.back()
          }
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <InputField name='title' placeholder='title' label='Title' />
            <Box mt={4}>
              <InputField
                textarea={true}
                name='text'
                placeholder='text...'
                label='Text'
              />
            </Box>

            <Button
              mt={4}
              type='submit'
              isLoading={isSubmitting}
              colorScheme='teal'
            >
              Update Post
            </Button>
          </Form>
        )}
      </Formik>
    </Layout>
  )
}

export default withUrqlClient(createUrqlClient)(EditPost)
