import React from 'react'
import { NavBar } from '../components/NavBar'
import { withUrqlClient } from 'next-urql'
import { createUrqlClient } from '../utils/createUrqlClient'

const Index = () => (
  <>
    <NavBar></NavBar>
    <div>Hello, World</div>
  </>
)

export default withUrqlClient(createUrqlClient)(Index)