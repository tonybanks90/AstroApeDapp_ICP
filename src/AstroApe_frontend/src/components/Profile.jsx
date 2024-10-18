import React, { useState } from "react";
import Button from "./Button"; // Assuming you have a Button component
import Input from "./Input";  // Assuming you have an Input component
import Leaderboard from "./Leaderboard"; // Importing the Leaderboard component
import { FaCopy, FaCog } from "react-icons/fa"; // For icons
import { leaderboardData } from "../constants/index";

const Profile = () => {
  const [cryptoAddress] = useState("0x1234...abcd");
  const [rewardsBalance] = useState("12.34 ICP");
  const [ethBalance] = useState("1.25 ETH");
  const [solBalance] = useState("10.5 SOL");
  const [icpBalance] = useState("5.0 ICP");

  

  const handleCopy = () => {
    navigator.clipboard.writeText(cryptoAddress);
    alert("Crypto address copied to clipboard!");
  };

  return (
    <div className="mt-20 p-6 lg:p-8">
      <section className="flex flex-col lg:flex-row items-center mb-8">
        <div className="flex items-center mb-4 lg:mb-0 lg:mr-8">
          <img
            src="/path/to/profile-pic.jpg"
            alt="Profile Pic"
            className="w-24 h-24 rounded-full mr-4"
          />
          <div>
            <h1 className="text-3xl font-bold text-n-1">Username</h1>
            <p className="text-n-2">Some cool tags</p>
          </div>
          <button className="ml-4 text-n-2 hover:text-n-1" onClick={() => alert('Edit profile coming soon!')}>
            <FaCog size={24} />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row items-center lg:ml-auto">
          <div className="flex items-center bg-n-8 border border-n-6 rounded-lg p-4">
            <p className="text-n-1 mr-2">{cryptoAddress}</p>
            <button onClick={handleCopy} className="text-n-2 hover:text-n-1">
              <FaCopy size={18} />
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Rewards Balance Card */}
        <div className="bg-n-8 border border-n-6 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-2 text-n-1">Rewards Balance</h2>
          <p className="text-4xl font-bold text-green-400 mb-4">{rewardsBalance}</p>
          <Button onClick={() => alert('Claiming rewards...')}>Claim</Button>
        </div>

        {/* Wallet Balance Card */}
        <div className="bg-n-8 border border-n-6 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-2 text-n-1">Wallet Balance</h2>
          <div className="space-y-2">
            <p className="text-lg text-n-2">ETH: {ethBalance}</p>
            <p className="text-lg text-n-2">SOL: {solBalance}</p>
            <p className="text-lg text-n-2">ICP: {icpBalance}</p>
          </div>
        </div>
      </section>

      {/* Referral Leaderboard */}
      <Leaderboard data={leaderboardData} />
    </div>
  );
};

export default Profile;
