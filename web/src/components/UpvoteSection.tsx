import { ChevronUpIcon, ChevronDownIcon } from '@chakra-ui/icons'
import { Flex, IconButton } from '@chakra-ui/react'
import React from 'react'
import { PostSnippetFragment, useVoteMutation } from '../generated/graphql'

interface UpvoteSectionProps {
  post: PostSnippetFragment
}

export const UpvoteSection: React.FC<UpvoteSectionProps> = ({ post }) => {
  const [_, vote] = useVoteMutation()
  return (
    <Flex
      direction='column'
      justifyContent='center'
      alignItems='center'
      mr='8px'
    >
      <IconButton
        aria-label='upvote'
        icon={<ChevronUpIcon />}
        backgroundColor={post.voteStatus === 1 ? '#4BB543' : undefined}
        onClick={() => {
          if (post.voteStatus === 1) return
          vote({ postId: post.id, value: 1 })
        }}
      />
      {post.points}
      <IconButton
        aria-label='downvote'
        backgroundColor={post.voteStatus === -1 ? 'tomato' : undefined}
        icon={<ChevronDownIcon />}
        onClick={() => {
          if (post.voteStatus === -1) return
          vote({ postId: post.id, value: -1 })
        }}
      />
    </Flex>
  )
}
