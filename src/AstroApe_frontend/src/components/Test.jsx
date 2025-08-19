// src/components/Test.jsx
import React, { useEffect, useState } from "react";
import { Actor, HttpAgent } from "@dfinity/agent";
// Import your generated declarations (adjust path if needed)
import { idlFactory as tokenFactoryIDL, canisterId as tokenFactoryId } from "../../../declarations/TokenFactory";

const Test = () => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTokens = async () => {
      try {
        const agent = new HttpAgent();
        // Uncomment if running locally
        // await agent.fetchRootKey();

        const tokenFactory = Actor.createActor(tokenFactoryIDL, {
          agent,
          canisterId: tokenFactoryId,
        });

        // Example query - adjust to your canister’s API
        const result = await tokenFactory.getTokens();
        setTokens(result);
      } catch (err) {
        console.error("Error fetching tokens:", err);
      } finally {
        setLoading(false);
      }
    };

    loadTokens();
  }, []);

  return (
    <div className="p-4 mt-8">
      <h1 className="text-xl font-bold mb-4">TokenFactory Query Test</h1>
      {loading ? (
        <p>Loading tokens...</p>
      ) : tokens.length === 0 ? (
        <p>No tokens found.</p>
      ) : (
        <ul className="space-y-2">
          {tokens.map((token, idx) => (
            <li key={idx} className="p-2 border rounded">
              <p><strong>Name:</strong> {token.name}</p>
              <p><strong>Ticker:</strong> {token.symbol}</p>
              <p><strong>Supply:</strong> {token.totalSupply}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Test;
