import { Box, Button, Flex, Heading, Link } from '@chakra-ui/react'
import { Formik, Form } from 'formik'
import { withUrqlClient } from 'next-urql'
import React, { useState } from 'react'
import { InputField } from '../components/InputField'
import { Wrapper } from '../components/Wrapper'
import { useForgotPasswordMutation } from '../generated/graphql'
import { createUrqlClient } from '../utils/createUrqlClient'

const ForgotPassword: React.FC = () => {
  const [, forgotPass] = useForgotPasswordMutation()
  const [done, setDone] = useState(false)

  if (!done)
    return (
      <Wrapper variant='small'>
        <Formik
          initialValues={{ email: '' }}
          onSubmit={async values => {
            await forgotPass({ ...values })
            setDone(true)
          }}
        >
          {({ isSubmitting }) => (
            <Form>
              <InputField
                name='email'
                placeholder='email'
                label='Email'
                type='email'
              />
              <Button
                mt={4}
                type='submit'
                isLoading={isSubmitting}
                colorScheme='teal'
              >
                submit
              </Button>
            </Form>
          )}
        </Formik>
      </Wrapper>
    )
  return (
    <Flex>
      <Box m='auto' mt='16' color='green'>
        <Heading size='lg'>Password reset link sent to your email</Heading>
      </Box>
    </Flex>
  )
}

export default withUrqlClient(createUrqlClient)(ForgotPassword)
