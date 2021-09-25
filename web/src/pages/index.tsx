import React from 'react'
import { NavBar } from '../components/NavBar'
import { withUrqlClient } from 'next-urql'
import { createUrqlClient } from '../utils/createUrqlClient'
import { usePostsQuery } from '../generated/graphql'

const Index = () => {
  const [{ data, fetching }, posts] = usePostsQuery()

  return (
    <>
      <NavBar></NavBar>
      <div>Hello, World</div>
      <br />
      {fetching ? (
        <div>loading...</div>
      ) : (
        data?.posts.map(p => <div key={p.id}>{p.title}</div>)
      )}
    </>
  )
}

export default withUrqlClient(createUrqlClient, { ssr: true })(Index)
