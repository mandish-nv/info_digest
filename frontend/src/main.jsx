import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'

import Register from './pages/registerPage'
import RegisterStatus from './pages/registerStatus'
import Login from './pages/loginPage'
import LandingPage from './pages/landingPage'
import ErrorMessage from './errorMessage'
import AdminPanel from './pages/adminPanel'
import UserProfile from './pages/userProfile'

import "./css/General.css"

const router=createBrowserRouter([
  {
    path:'/',
    element:<LandingPage /> ,
    errorElement:<ErrorMessage/>
  },
  {
    path:'/register',
    element:<Register/>,
    errorElement:<ErrorMessage/>
  },
  {
    path:'/register-status',
    element:<RegisterStatus/>,
    errorElement:<ErrorMessage/>
  },
  {
    path:'/login',
    element:<Login/>,
    errorElement:<ErrorMessage/>
  },
  {
    path:'/adminPanel',
    element:<AdminPanel/>,
    errorElement:<ErrorMessage/>
  },
  {
    path:'/profile',
    element:<UserProfile/>,
    errorElement:<ErrorMessage/>
  },
  {
    path:'/profile/:id',
    element:<UserProfile/>,
    errorElement:<ErrorMessage/>
  },
], { debug: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router}></RouterProvider> 
  </StrictMode>
)
