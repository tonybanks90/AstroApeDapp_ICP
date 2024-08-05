import React, { useState } from 'react';
import Input from './Input';
import Button from './Button';

const Chat = ({ chatMessages, onSendMessage }) => {
  const [message, setMessage] = useState('');

  const handleSendMessage = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <div className="flex-1 bg-gray-900 p-4 rounded-lg">
      <div className="h-64 overflow-y-auto mb-4">
        {chatMessages.map((msg, index) => (
          <div key={index} className="mb-2">
            <strong>{msg.user}: </strong>{msg.text}
          </div>
        ))}
      </div>
      <div className="flex">
        <Input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-l-lg"
        />
        <Button onClick={handleSendMessage} className="rounded-r-lg">
          Send
        </Button>
      </div>
    </div>
  );
};

export default Chat;
