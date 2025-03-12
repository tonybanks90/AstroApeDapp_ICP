import React, { useState, useEffect } from 'react';
import Chats from './Chat';
import Trades from './Trades';
import TokenDistributionCard from './TokenDistributionCard';

const ChatAndTrades = () => {
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
    <div className="flex flex-col text-white w-full h-screen border border-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div className="flex p-2 relative">
        <button
          onClick={() => setView('chat')}
          className={`flex-1 py-2 text-center text-sm font-medium transition-all duration-300 relative ${
            view === 'chat' ? 'text-white' : 'text-gray-300 hover:bg-gray-600'
          }`}
        >
          Chat
          {view === 'chat' && <div className="absolute bottom-0 left-0 w-full h-1 bg-purple-500"></div>}
        </button>
        <button
          onClick={() => setView('trades')}
          className={`flex-1 py-2 text-center text-sm font-medium transition-all duration-300 relative ${
            view === 'trades' ? 'text-white' : 'text-gray-300 hover:bg-gray-600'
          }`}
        >
          Trades
          {view === 'trades' && <div className="absolute bottom-0 left-0 w-full h-1 bg-purple-500"></div>}
        </button>
        {isSmallScreen && (
          <button
            onClick={() => setView('distribution')}
            className={`flex-1 py-2 text-center text-sm font-medium transition-all duration-300 relative ${
              view === 'distribution' ? 'text-white' : 'text-gray-300 hover:bg-gray-600'
            }`}
          >
            Token Distribution
            {view === 'distribution' && <div className="absolute bottom-0 left-0 w-full h-1 bg-purple-500"></div>}
          </button>
        )}
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        {view === 'chat' && <Chats />}
        {view === 'trades' && <Trades />}
        {isSmallScreen && view === 'distribution' && <TokenDistributionCard />}
      </div>
    </div>
  );
};

export default ChatAndTrades;
