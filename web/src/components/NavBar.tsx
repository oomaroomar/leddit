import { Box, Button, Flex, Link } from '@chakra-ui/react'
import NextLink from 'next/link'
import React, { ReactElement } from 'react'
import { useLogoutMutation, useMeQuery } from '../generated/graphql'

interface NavBarProps {}

export const NavBar: React.FC<NavBarProps> = ({}) => {
  const [{ data, fetching }] = useMeQuery({
    // pause: isServer(),
  })
  // Would stop an unneccesary request but I don't want the client and server to be out of sync { pause: isServer() }
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
