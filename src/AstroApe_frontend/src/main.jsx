import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Profile from './components/Profile';
import WalletProfile from './components/WalletProfile'; // Import WalletProfile
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
import SwapAndDistribution from './components/SwapAndDistribution';
import ConnectWallet from './components/ConnectWallet';
import Work from './components/Work';
import ChatAndTrades from './components/ChatAndTrades';
import TradingChart from './components/TradingChart';
import TradingViewChart from './components/TradingViewChart';
import Blog from './pages/Blog';
import CandlestickChart from './components/CandlestickChart';

import { ThemeProvider } from './contexts/theme';
import DepositWithdraw from './components/Deposit&Withdraw';

import { Buffer } from "buffer";
window.Buffer = Buffer;

import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";

import { SiweIdentityProvider } from 'ic-use-siwe-identity';
import { canisterId, idlFactory } from "../../declarations/ic_siwe_provider/index.js";
import Tokens from './components/Tokens';
import Liquidity from './components/Liquidity';
import Created from './components/Created';
import Activity from './components/Activity';
import Faucet from './components/Faucet';



const config = getDefaultConfig({
  appName: 'AstroApe App',
  projectId: 'YOUR_PROJECT_ID',
  chains: [mainnet],
  ssr: true, // If your dApp uses server-side rendering (SSR)
});

const queryClient = new QueryClient();
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
      { path: '/Token/profile', element: <Profile /> },
      { path: '/Token/4', element: <Referral /> },
      { path: '/Token/5', element: <Governance /> },
      { path: '/Token/7', element: <ConnectWallet /> },
      { path: '/Token/8', element: <DepositWithdraw /> },
      { path: '/Token/faucet', element: <Faucet /> },
      { path: '/Token/swap/:tokenId', element: <SwapAndDistribution /> },
      {
        path: '/Token/profile',
        element: <WalletProfile />,
        children: [
          { path: 'tokens', element: <Tokens /> },
          { path: 'liquidity', element: <Liquidity /> },
          { path: 'created', element: <Created /> },
          { path: 'activity', element: <Activity /> }
        ]
      },
    ]
  },

  { path: '/2', element: <Work /> },
  { path: '/', element: <LandingPage /> },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <RainbowKitProvider>
          <SiweIdentityProvider canisterId={canisterId} idlFactory={idlFactory}>
            <ThemeProvider>
              <RouterProvider router={router} />
            </ThemeProvider>
          </SiweIdentityProvider>
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
