import { Box, Button, Flex, Heading, Link } from '@chakra-ui/react'
import NextLink from 'next/link'
import React, { ReactElement } from 'react'
import { useLogoutMutation, useMeQuery } from '../generated/graphql'
import {useRouter} from 'next/router'

interface NavBarProps {}

export const NavBar: React.FC<NavBarProps> = ({}) => {
  const router = useRouter()
  const [{ fetching: logoutFetching }, logout] = useLogoutMutation()
  const [{ data, fetching }] = useMeQuery()
  let body: ReactElement | null = null

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
      <Flex align='center'>
        <NextLink href='/create-post'>
          <Button as={Link} mr='4'>
            create post
          </Button>
        </NextLink>
        <Box mr='2'>{data.me.username}</Box>
        <Button
          onClick={async () => {
            await logout()
            router.reload()
          }}
          isLoading={logoutFetching}
          variant='link'
        >
          Logout
        </Button>
      </Flex>
    )
  }

  return (
    <Flex zIndex={1} position='sticky' top={0} p={4} ml={'auto'} bg='blue.200'>
      <Flex flex='1' margin='auto' maxW='800' align='center'>
        <NextLink href='/'>
          <Link mx={4}>
            <Heading fontSize='2xl'>Leddit</Heading>
          </Link>
        </NextLink>
        <Box ml={'auto'}>{body}</Box>
      </Flex>
    </Flex>
  )
}
