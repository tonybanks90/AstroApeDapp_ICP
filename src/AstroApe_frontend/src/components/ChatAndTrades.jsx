import React, { useState, useEffect } from 'react';
import Chats from './Chat';
import Trades from './Trades';
import TokenDistributionCard from './TokenDistributionCard';
import { candlestickData } from "../data/chartData";
import CoinDetails from './CoinDetails';


const ChatAndTrades = ({ tokenId }) => {
  const distributionData = candlestickData[tokenId]?.distribution || [];
  const [view, setView] = useState('chat');
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex flex-col text-white w-full border border-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div className="flex p-2 gap-2 relative">
        <button
          onClick={() => setView('chat')}
          className={`flex-1 py-2 border rounded-md text-center text-sm font-medium transition-all duration-300 relative ${
            view === 'chat' ? 'bg-color-1 text-white' : ' hover:text-color-1'
          }`}
        >
          Chat
          {view === 'chat' && <div className="bg-purple-600 text-white"></div>}
        </button>
        <button
          onClick={() => setView('trades')}
          className={`flex-1 py-2 border rounded-md text-center text-sm font-medium transition-all duration-300 relative ${
            view === 'trades' ? 'bg-color-1 text-white' : ' hover:text-color-1'
          }`}
        >
          Trades
          {view === 'trades' && <div className="bg-purple-600 text-white"></div>}
        </button>
        <button
          onClick={() => setView('Distribution')}
          className={`flex-1 py-2 border rounded-md text-center text-sm font-medium transition-all duration-300 relative ${
            view === 'Distribution' ? 'bg-color-1 text-white' : ' hover:text-color-1'
          }`}
        >
          Distribution
          {view === 'Distribution' && <div className="bg-purple-600 text-white"></div>}
        </button>
        {isSmallScreen && (
          <button
            onClick={() => setView('info')}
            className={`flex-1 py-2 border rounded-md text-center text-sm font-medium transition-all duration-300 relative ${
              view === 'distribution' ? 'bg-color-1 text-white' : ' hover:text-color-1'
            }`}
          >
            Info
            {view === 'distribution' && <div className="absolute bottom-0 left-0 w-full h-1 bg-purple-500"></div>}
          </button>
        )}
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        {view === 'chat' && <Chats />}
        {view === 'trades' && <Trades />}
        {view === 'trades' && <TokenDistributionCard tokenId={tokenId}/>}
        {isSmallScreen && view === 'distribution' && <CoinDetails tokenId={tokenId} />}
      </div>
    </div>
  );
};

export default ChatAndTrades;
