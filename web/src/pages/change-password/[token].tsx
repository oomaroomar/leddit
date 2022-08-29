import { Box, Button, Flex, Link } from '@chakra-ui/react'
import { Formik, Form } from 'formik'
import { withUrqlClient } from 'next-urql'
import { useRouter } from 'next/router'
import React, { useState } from 'react'
import { InputField } from '../../components/InputField'
import { Wrapper } from '../../components/Wrapper'
import { useChangePasswordMutation } from '../../generated/graphql'
import { createUrqlClient } from '../../utils/createUrqlClient'
import { toErrorMap } from '../../utils/toErrorMap'
import NextLink from 'next/link'
import { NextPage } from 'next'

export const ChangePassword: React.FC = () => {
  const [, changePassword] = useChangePasswordMutation()
  const router = useRouter()
  const [tokenError, setTokenError] = useState('')
  return (
    <Wrapper variant='small'>
      <Formik
        initialValues={{ newPassword: '' }}
        onSubmit={async (values, { setErrors }) => {
          const response = await changePassword({
            newPassword: values.newPassword,
            token:
              typeof router.query.token === 'string' ? router.query.token : '',
          })
          if (response.data?.changePassword.errors) {
            const errorMap = toErrorMap(response.data.changePassword.errors)
            console.log(errorMap)
            if ('token' in errorMap) {
              setTokenError(errorMap.token)
            }
            setErrors({ newPassword: errorMap.password })
          } else {
            console.log(response)
            router.push('/')
          }
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <Box mt={4}>
              <InputField
                name='newPassword'
                placeholder='new password'
                label='New Password'
                type='password'
              />
            </Box>
            {tokenError && (
              <Flex>
                <Box marginRight='2' color='red'>
                  {tokenError}
                </Box>
                <NextLink href='/forgot-password'>
                  <Link color='teal'>click here to recieve new token</Link>
                </NextLink>
              </Flex>
            )}
            <Button
              mt={4}
              type='submit'
              isLoading={isSubmitting}
              colorScheme='teal'
            >
              Change password
            </Button>
          </Form>
        )}
      </Formik>
    </Wrapper>
  )
}

export default withUrqlClient(createUrqlClient)(ChangePassword)
