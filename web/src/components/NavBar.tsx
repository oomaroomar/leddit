import { Box, Button, Flex, Link } from '@chakra-ui/react'
import React from 'react'
import NextLink from 'next/link'
import { useLogoutMutation, useMeQuery } from '../generated/graphql'
import { ReactElement } from 'react'

interface NavBarProps {}

export const NavBar: React.FC<NavBarProps> = ({}) => {
  const [{ data, fetching }] = useMeQuery()
  const [{ fetching: logoutFetching }, logout] = useLogoutMutation()
  let body: ReactElement | null = null
  console.log(data)

  if (fetching) {
    // let body be null
  } else if (!data?.me) {
    body = (
      <>
        <NextLink href='/login'>
          <Link mx={4}>Login</Link>
        </NextLink>
        <NextLink href='register'>
          <Link mx={4}>Register</Link>
        </NextLink>
      </>
    )
  } else {
    body = (
      <Box>
        <Box>{data.me.username}</Box>
        <Button
          onClick={() => {
            logout()
          }}
          isLoading={logoutFetching}
          variant='link'
        >
          Logout
        </Button>
      </Box>
    )
  }

  return (
    <Flex p={4} ml={'auto'} bg='blue.200'>
      <Box ml={'auto'}>{body}</Box>
    </Flex>
  )
}
