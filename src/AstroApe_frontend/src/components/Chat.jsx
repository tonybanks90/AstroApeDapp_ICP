import React, { useState, useEffect } from "react";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "../../../declarations/Comments";
import { useSiweIdentity } from "ic-use-siwe-identity";

const Chat = ({ tokenId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const { identity } = useSiweIdentity();

  // Create actor dynamically
  const createCommentsActor = () => {
    const isLocal = process.env.DFX_NETWORK === "local" || process.env.NODE_ENV === "development";
    const agent = new HttpAgent({
      host: isLocal ? "http://127.0.0.1:4943" : "https://icp-api.io",
      identity: identity || undefined, // Use SIWE identity if available
    });

    if (isLocal) {
      agent.fetchRootKey().catch(console.error);
    }

    return Actor.createActor(idlFactory, {
      agent,
      canisterId: process.env.CANISTER_ID_COMMENTS || "vpyes-67777-77774-qaaeq-cai",
    });
  };

  const [commentsBackend] = useState(createCommentsActor());

  // Use tokenId as groupId
  const groupId = tokenId;

  const fetchComments = async () => {
    if (!groupId) return;

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

  const handlePostComment = async () => {
    if (!newComment.trim()) return;

    // Optimistic update
    const tempId = Date.now();
    const tempComment = {
      id: tempId,
      text: newComment,
      author: identity ? identity.getPrincipal().toText() : "Me",
      timestamp: new Date().toLocaleString(),
      pending: true
    };

    setComments(prev => [tempComment, ...prev]);
    setNewComment("");

    try {
      await commentsBackend.postComment(groupId, tempComment.text);
      fetchComments(); // Refresh to get real ID and timestamp
    } catch (error) {
      console.error("Error posting comment:", error);
      // Revert optimism if failed
      setComments(prev => prev.filter(c => c.id !== tempId));
      alert("Failed to post comment. Make sure you are logged in.");
    }
  };

  // Poll for new comments
  useEffect(() => {
    fetchComments();
    const interval = setInterval(fetchComments, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [groupId]);

  return (
    <div className="space-y-4 p-2 h-[400px] flex flex-col">
      {/* Input Section */}
      <div className="p-2 flex items-center gap-2 border-b border-n-6">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
          placeholder={identity ? "Type a comment..." : "Login to chat..."}
          disabled={!identity}
          className="flex-1 p-2 bg-n-7 text-white rounded-lg focus:outline-none border border-n-6 focus:border-color-1"
        />
        <button
          onClick={handlePostComment}
          disabled={!newComment.trim() || !identity}
          className="px-3 py-2 bg-color-1 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          Post
        </button>
      </div>

      {/* Display Comments */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-n-6 scrollbar-track-transparent">
        {comments.length > 0 ? (
          comments.map((chat) => (
            <div
              key={chat.id.toString()}
              className={`p-3 rounded-lg border ${chat.pending ? 'border-yellow-500/50 opacity-70' : 'border-n-6'} bg-n-8/50 flex items-start gap-3`}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-color-1 to-purple-800 rounded-full flex items-center justify-center text-xs font-bold">
                {chat.author.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <p className="text-sm font-medium text-color-1 truncate max-w-[200px]" title={chat.author}>
                    {chat.author}
                  </p>
                  <span className="text-n-4 text-[10px]">{chat.timestamp}</span>
                </div>
                <p className="text-n-1 text-sm mt-1 break-words">{chat.text}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex items-center justify-center text-n-4 italic">
            No comments yet. Be the first to say hi! 👋
          </div>
        )}
      </div>

      {!identity && (
        <div className="text-center text-xs text-yellow-500 mt-2">
          ⚠ You must be logged in to post comments.
        </div>
      )}
    </div>
  );
};

export default Chat;
