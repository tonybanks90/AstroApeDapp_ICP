import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Profile from './components/Profile';


import Header from './components/Header';
import Work from './components/Work';


import './index.css';
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import NotFoundPage from './pages/NotFoundPage';
import LandingPage from './pages/LandingPage';
import TokenDeploy from './pages/TokenDeploy';
import Deploy from './components/Deploy';
import Roadmap from './components/Roadmap';
import NewPairs from './components/NewPairs';
import Referral from './components/Referral';
import Governance from './components/Governance';






const router = createBrowserRouter([
  {
    path: '/3',
    element: <Header />,
    errorElement: <NotFoundPage />,
  },
  {
    path: '/Token',
    element: <TokenDeploy />,
    children: [
      {
        path: '/Token/1',
        element: <NewPairs />,
      },
      {
        path: '/Token/2',
        element: <Deploy />,
      },
      {
        path: '/Token/3',
        element: <Profile />
      },
      {
        path: '/Token/4',
        element: <Referral />,
      },
      {
        path: '/Token/5',
        element: <Governance />,
      },
    ]
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

