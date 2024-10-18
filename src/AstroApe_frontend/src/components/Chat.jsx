import React, { useState, useEffect } from 'react';
import Input from './Input';
import Button from './Button';
import { AstroApe_backend } from '../../../../src/declarations/AstroApe_backend'; // Adjust this path if necessary

const Chat = () => {
  const [message, setMessage] = useState('');
  const [gifUrl, setGifUrl] = useState('');
  const [chatMessages, setChatMessages] = useState([]);

  const actor = AstroApe_backend; // This should be the correct actor instance for your canister

  useEffect(() => {
    const fetchComments = async () => {
      const fetchedComments = await actor.getComments();
      setChatMessages(fetchedComments);
    };
    fetchComments();
  }, []);

  const handleSendMessage = async () => {
    if (message.trim() || gifUrl.trim()) {
      await actor.addComment(message, gifUrl || null);
      setMessage('');
      setGifUrl('');
      const updatedComments = await actor.getComments();
      setChatMessages(updatedComments);
    }
  };

  return (
    <div className="flex-1 bg-gray-900 p-4 rounded-lg">
      <div className="h-64 overflow-y-auto mb-4">
        {chatMessages.map((msg, index) => (
          <div key={index} className="mb-2">
            <strong>{msg.user || 'Anonymous'}: </strong>{msg.content}
            {msg.gif_url && <img src={msg.gif_url} alt="GIF" className="mt-2" />}
            <div className="text-sm text-gray-500">
              {new Date(Number(msg.timestamp)).toLocaleString()}
            </div>
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
        <Input
          type="text"
          value={gifUrl}
          onChange={(e) => setGifUrl(e.target.value)}
          placeholder="Paste GIF URL (optional)"
          className="ml-2 flex-1"
        />
        <Button onClick={handleSendMessage} className="rounded-r-lg">
          Send
        </Button>
      </div>
    </div>
  );
};

export default Chat;
