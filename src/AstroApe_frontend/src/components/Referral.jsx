import React, { useState } from "react";
import Button from "./Button"; 
import Input from "./Input";
import Leaderboard from "./Leaderboard"; // Import the Leaderboard component

const Referral = () => {
  const [referralLink] = useState("https://astroape.com/referral/123456");
  const [showClaimPopup, setShowClaimPopup] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    alert("Referral link copied to clipboard!");
  };

  const handleClaim = () => {
    setShowClaimPopup(true);
    setTimeout(() => {
      setShowClaimPopup(false);
      alert("Commission claimed successfully!");
    }, 2000);
  };

  // Sample data for the leaderboard
  const leaderboardData = [
    { name: 'Alice', volume: '100 ICP' },
    { name: 'Bob', volume: '90 ICP' },
    { name: 'Charlie', volume: '80 ICP' },
    { name: 'Dave', volume: '70 ICP' },
  ];

  return (
    <div className="mt-15 p-6 lg:p-8">
      {/* Banner Intro */}
      <section className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg p-6 mb-8">
        <h1 className="text-3xl font-bold mb-2">Earn 1% of Each Trade</h1>
        <p className="text-lg">Share your referral link and earn 1% of every trade they make. Start earning now!</p>
      </section>

      {/* Referral Link Section */}
      <section className="bg-n-8 border border-n-6 rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-n-1">Your Referral Link</h2>
        <div className="flex flex-col lg:flex-row lg:items-center">
          <Input
            id="referralLink"
            name="referralLink"
            type="text"
            value={referralLink}
            readOnly
            className="flex-grow mb-4 lg:mb-0 lg:mr-4"
          />
          <div className="flex space-x-4">
            <Button onClick={handleCopy}>Copy</Button>
            <Button onClick={handleClaim}>Claim</Button>
          </div>
        </div>
      </section>

      {/* Statistics Boxes */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-n-8 border border-n-6 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-2 text-n-1">Total Referrals</h3>
          <p className="text-4xl font-bold text-green-400">42</p>
        </div>
        <div className="bg-n-8 border border-n-6 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-2 text-n-1">Commission Earned</h3>
          <p className="text-4xl font-bold text-yellow-400">12.34 ETH</p>
        </div>
        <div className="bg-n-8 border border-n-6 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-2 text-n-1">Referral Hits</h3>
          <p className="text-4xl font-bold text-blue-400">153</p>
        </div>
      </section>

      {/* Leaderboard Section */}
      <Leaderboard data={leaderboardData} />

      {/* Claim Popup */}
      {showClaimPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4">Claiming Your Commission...</h2>
            <p>Please wait while we process your request.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Referral;
