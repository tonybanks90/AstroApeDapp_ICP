import React from 'react';
import { FaTrophy } from 'react-icons/fa';

const Leaderboard = ({ data }) => {
  return (
    <div className="bg-n-8 border border-n-6 rounded-lg p-6 shadow-lg">
      <h2 className="text-2xl font-bold text-n-1 mb-4">Referral Leaderboard</h2>
      <div className="grid grid-cols-2 gap-x-6 border-b-2 border-n-6 pb-2 mb-4">
        <span className="text-lg font-medium text-n-1">Profile Name</span>
        <span className="text-lg font-medium text-n-1">Referral Volume (ICP)</span>
      </div>
      <ul className="space-y-4">
        {data.map((item, index) => (
          <li
            key={index}
            className="grid grid-cols-2 gap-x-6 border-b border-n-6 pb-2"
          >
            <span className="text-n-1 flex items-center">
              {index < 3 && <FaTrophy className="text-gold mr-2" />}
              {item.name}
            </span>
            <span className="text-n-1">{item.volume}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Leaderboard;
