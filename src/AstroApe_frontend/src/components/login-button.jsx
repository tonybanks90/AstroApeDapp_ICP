import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useSiweIdentity } from "ic-use-siwe-identity";
import { useActor } from "../ic/Actors";

export default function LoginButton() {
  const { isConnected } = useAccount();
  const { login, loginStatus, identity } = useSiweIdentity();
  const { actor } = useActor();

  const [username, setUsername] = useState("");
  const [savedUsername, setSavedUsername] = useState(null);
  const [users, setUsers] = useState([]);
  const [actorInitialized, setActorInitialized] = useState(false);

  // 🔍 Debug: Log identity state when it changes
  useEffect(() => {
    if (identity) {
      try {
        console.log("🔑 Identity updated:", identity.getPrincipal().toString());
      } catch (error) {
        console.error("❌ Error getting principal from identity:", error);
      }
    } else {
      console.log("⚠️ Identity is missing");
    }
  }, [identity]);

  // 🔍 Debug: Log actor state when it changes
  useEffect(() => {
    if (identity) {
      console.log("🔄 Identity detected, attempting to initialize actor...");
      setTimeout(() => {
        if (!actor) {
          console.warn("⚠️ Actor still missing! Reinitializing...");
          // Force reinitialize (assuming useActor handles reinitialization)
          useActor();  
        }
      }, 2000);
    }
  }, [identity, actor]);
  
  // Auto-login when connected
  useEffect(() => {
    if (isConnected && !identity && loginStatus !== "logging-in") {
      console.log("⚡ Triggering auto-login...");
      login();
    }
  }, [isConnected, identity, loginStatus, login]);

  // Fetch username only when actor + identity are valid
  const fetchUsername = async () => {
    if (!actor) {
      console.warn("⚠️ Skipping fetchUsername: Actor is not initialized.");
      return;
    }
    if (!identity) {
      console.warn("⚠️ Skipping fetchUsername: Identity is missing.");
      return;
    }

    try {
      const principal = identity.getPrincipal().toText();
      console.log("🔍 Fetching username for:", principal);
      const storedUsername = await actor.getUser(principal);
      setSavedUsername(storedUsername || null);
    } catch (error) {
      console.error("❌ Fetch username failed:", error);
    }
  };

  // Fetch all users
  const fetchUsers = async () => {
    if (!actor) return;
    try {
      console.log("📡 Fetching user list...");
      const userList = await actor.listUsers();
      setUsers(userList || []);
    } catch (error) {
      console.error("❌ Fetch users failed:", error);
    }
  };

  // Load user data when actor + identity are available
  useEffect(() => {
    if (actor && identity) {
      fetchUsername();
      fetchUsers();
    }
  }, [actor, identity]);

  // Save username handler
  const saveUsername = async () => {
    try {
      if (!actor) throw new Error("Actor not initialized");
      if (!identity) throw new Error("Identity not set");
      if (!username) throw new Error("Empty username");

      console.log("📝 Saving username:", username);
      await actor.addUser(username);
      setSavedUsername(username);
      setUsername("");

      await Promise.all([fetchUsername(), fetchUsers()]);
    } catch (error) {
      console.error("❌ Save failed:", error);
    }
  };

  // UI Rendering
  if (identity) {
    return (
      <div className="text-white bg-gray-800 p-3 rounded-md">
        <p>Signed in as:</p>
        <p className="font-bold break-all">{identity.getPrincipal().toString()}</p>

        {savedUsername ? (
          <div className="mt-4">
            <p className="text-green-400">
              Registered as: <span className="font-bold">{savedUsername}</span>
            </p>
            <button
              onClick={() => setSavedUsername(null)}
              className="mt-2 text-sm text-blue-300 hover:text-blue-500"
            >
              Change username
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="flex-1 p-2 rounded text-black"
              />
              <button
                onClick={saveUsername}
                disabled={!actorInitialized || !username}
                className={`ml-2 p-2 ${
                  actorInitialized
                    ? "bg-blue-500 hover:bg-blue-600"
                    : "bg-gray-500 cursor-not-allowed"
                } text-white rounded`}
              >
                {actorInitialized ? "Save" : "Initializing..."}
              </button>
            </div>
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Registered Users</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {users?.length > 0 ? (
              users.map(([principal, username]) => (
                <div key={principal} className="p-3 bg-gray-700 rounded-lg">
                  <p className="text-blue-300 font-mono text-sm break-all">{principal}</p>
                  <p className="mt-1 text-white">{username}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-400">No users found.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      disabled={loginStatus === "logging-in" || !isConnected}
      onClick={() => void login()}
      className={`px-6 py-3 rounded-lg transition-colors
        ${loginStatus === "logging-in" 
          ? "bg-purple-500 cursor-wait" 
          : "bg-purple-600 hover:bg-purple-700"}
        ${!isConnected && "opacity-50 cursor-not-allowed"}
      `}
    >
      {loginStatus === "logging-in" ? "Authenticating..." : "Sign in with Ethereum"}
    </button>
  );
}
