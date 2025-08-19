import React, { useState, useEffect } from "react";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory, canisterId } from "../../../declarations/Comments";

// Set up an actor to interact with the backend
const agent = new HttpAgent();

if (process.env.DFX_NETWORK === "local") {
  agent.fetchRootKey();
}

const commentsBackend = Actor.createActor(idlFactory, { agent, canisterId });

const Chat = () => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  const groupId = "2"; // 🔐 Hardcoded group ID

  // Fetch comments for group "1"
  const fetchComments = async () => {
    try {
      const commentList = await commentsBackend.getComments(groupId);
      setComments(
        commentList.map(([id, text, author, timestamp]) => ({
          id,
          text,
          author: author.toText(),
          timestamp: new Date(Number(timestamp) * 1000).toLocaleString(),
        }))
      );
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  // Post comment to group "1"
  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    try {
      await commentsBackend.postComment(groupId, newComment);
      setNewComment("");
      fetchComments();
    } catch (error) {
      console.error("Error posting comment:", error);
    }
  };

  useEffect(() => {
    fetchComments();
  }, []);

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
          className="px-3 py-2 bg-color-1 hover:bg-color-5 text-white rounded-lg"
        >
          Post
        </button>
      </div>

      {/* Display Comments */}
      {comments.map((chat) => (
        <div
          key={chat.id}
          className="p-3 rounded-lg border border-gray-700 shadow-md flex items-start gap-3"
        >
          <span className="w-8 h-8 bg-color-1 rounded-full"></span>
          <div>
            <p className="text-sm font-medium text-color-1 flex items-center gap-2">
              {chat.author}{" "}
              <span className="text-gray-500 text-xs">{chat.timestamp}</span>
            </p>
            <p className="text-white text-sm mt-1">{chat.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Chat;
