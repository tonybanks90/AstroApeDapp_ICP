import React, { useState } from 'react';
import chatData from '../data/chatData';

const Chat = () => {
  const [comments, setComments] = useState(chatData);
  const [newComment, setNewComment] = useState('');

  const handlePostComment = () => {
    if (newComment.trim()) {
      const newChat = {
        username: 'You', // Placeholder for the current user
        time: new Date().toLocaleTimeString(),
        message: newComment,
      };
      setComments([newChat, ...comments]);
      setNewComment('');
    }
  };

  return (
    <div className="space-y-4 p-2">
      {/* Input Section */}
      <div className="p-2 flex items-center gap-2 border-b border-gray-700">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Type a comment..."
          className="flex-1 p-2 bg-gray-800 text-white rounded-lg focus:outline-none"
        />
        <button
          onClick={handlePostComment}
          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
        >
          Post Comment
        </button>
      </div>
      
      {comments.map((chat, index) => (
        <div key={index} className="p-3 rounded-lg border border-gray-700 shadow-md flex items-start gap-3">
          <span className="w-8 h-8 bg-blue-500 rounded-full"></span>
          <div>
            <p className="text-sm font-medium text-blue-400 flex items-center gap-2">
              {chat.username} <span className="text-gray-500 text-xs">{chat.time}</span>
            </p>
            <p className="text-white text-sm mt-1">{chat.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Chat;
