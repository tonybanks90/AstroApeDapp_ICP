import React from 'react'
import { Link } from "react-router-dom"

const NotFoundPage = () => {
  return (
    <div className='flex flex-col gap-2'>
      404 Not Found
      <Link to="/">Home</Link>
    </div>
  )
}

export default NotFoundPage
