import { EditIcon, DeleteIcon } from '@chakra-ui/icons'
import { Flex } from '@chakra-ui/layout'
import { IconButton } from '@chakra-ui/react'
import React from 'react'
import NextLink from 'next/link'
import { useDeletePostMutation } from '../generated/graphql'

interface EditDeletePostButtonsProps {
  id: number
}

export const EditDeletePostButtons: React.FC<EditDeletePostButtonsProps> = ({
  id,
}) => {
  const [, deletePost] = useDeletePostMutation()
  return (
    <Flex flexDirection='column' marginLeft='auto' alignItems='flex-end'>
      <NextLink href='/post/edit/[id]' as={`/post/edit/${id}`}>
        <IconButton
          maxW='32px'
          aria-label='edit post'
          icon={<EditIcon />}
          marginBottom='4'
        ></IconButton>
      </NextLink>
      <IconButton
        maxW='32px'
        aria-label='delete post'
        icon={<DeleteIcon />}
        onClick={() => {
          deletePost({ id })
        }}
      ></IconButton>
    </Flex>
  )
}
