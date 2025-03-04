import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Profile from './components/Profile';
import { AuthProvider } from "./auth/AuthContext";
import Header from './components/Header';
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
import SwapCard from './components/SwapCard';
import ConnectWallet from './components/ConnectWallet';
import Work from './components/Work';
import ChatAndTrades from './components/ChatAndTrades';
import TradingChart from './components/TradingChart';
import TradingViewChart from './components/TradingViewChart';
import Blog from './pages/Blog';
import CandlestickChart from './components/CandlestickChart';
import { ThemeProvider } from './contexts/theme';

import '@rainbow-me/rainbowkit/styles.css';
import { createConfig, configureChains, WagmiProvider } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { publicProvider } from "wagmi/providers";




import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

// 1️⃣ Configure chains & providers
const { chains, publicClient } = configureChains([mainnet], [publicProvider()]);

// 2️⃣ Create Wagmi config
const wagmiConfig = createConfig({
  autoConnect: true,
  publicClient,
});

// 3️⃣ Create Query Client
const queryClient = new QueryClient();

// 4️⃣ Define Routes
const router = createBrowserRouter([
  { path: '/3', element: <Header />, errorElement: <NotFoundPage /> },
  { path: '/Blog', element: <Blog />, errorElement: <NotFoundPage /> },
  { path: '/Whitepaper', element: <Header />, errorElement: <NotFoundPage /> },
  { path: '/FAQS', element: <Header />, errorElement: <NotFoundPage /> },
  {
    path: '/Token',
    element: <TokenDeploy />,
    children: [
      { path: '/Token/1', element: <NewPairs /> },
      { path: '/Token/2', element: <Deploy /> },
      { path: '/Token/3', element: <Profile /> },
      { path: '/Token/4', element: <Referral /> },
      { path: '/Token/5', element: <Governance /> },
      { path: '/Token/6', element: <SwapCard /> },
      { path: '/Token/7', element: <ConnectWallet /> },
      { path: '/Token/8', element: <CandlestickChart /> },
    ]
  },
  { path: '/2', element: <Work /> },
  { path: '/', element: <LandingPage /> },
]);

// 5️⃣ Render Application
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <RainbowKitProvider chains={chains}>
          <AuthProvider>
            <ThemeProvider>
              <RouterProvider router={router} />
            </ThemeProvider>
          </AuthProvider>
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
