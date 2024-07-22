import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';


import Header from './components/Header';
import Work from './components/Work';


import './index.css';
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import NotFoundPage from './pages/NotFoundPage';
import LandingPage from './pages/LandingPage';
import TokenDeploy from './pages/TokenDeploy';




const router = createBrowserRouter([
  {
    path: '/3',
    element: <Header />,
    errorElement: <NotFoundPage />,
  },
  {
    path: '/Token',
    element: <TokenDeploy />,
  },
  {
    path: '/2',
    element: <Work/>
  },
  {
    path: '/',
    element: <LandingPage />
  },
  
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);

