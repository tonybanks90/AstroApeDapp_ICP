import React, { useState } from 'react';
import Button from './Button';
import Trades from './Trades';
import Chat from './Chat';

const ChatAndTrades = () => {
  const [view, setView] = useState('chat');
  const [chatMessages, setChatMessages] = useState([
    { user: 'User1', text: 'Hello everyone!' },
    { user: 'User2', text: 'Good to be here!' },
  ]);

  const [trades] = useState([
    { id: 1, time: '12:30 PM', type: 'Buy', amount: '5 ETH', price: '$10,000' },
    { id: 2, time: '1:00 PM', type: 'Sell', amount: '2 ETH', price: '$4,000' },
  ]);

  const handleSendMessage = (message) => {
    setChatMessages([...chatMessages, { user: 'Me', text: message }]);
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-800 text-white rounded-lg">
      <div className="flex justify-center gap-4 mb-4">
        <Button
          onClick={() => setView('chat')}
          className={`px-4 py-2 ${
            view === 'chat' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'
          } rounded-lg`}
        >
          Chat
        </Button>
        <Button
          onClick={() => setView('trades')}
          className={`px-4 py-2 ${
            view === 'trades' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'
          } rounded-lg`}
        >
          Trades
        </Button>
      </div>

      {view === 'chat' ? (
        <Chat chatMessages={chatMessages} onSendMessage={handleSendMessage} />
      ) : (
        <Trades trades={trades} />
      )}
    </div>
  );
};

export default ChatAndTrades;
