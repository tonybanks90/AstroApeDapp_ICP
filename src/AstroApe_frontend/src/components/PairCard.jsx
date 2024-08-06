import React from "react";
import { FaGlobe, FaTelegram, FaTwitter } from "react-icons/fa";
import { Link } from "react-router-dom"; // Import Link from react-router-dom
import Button from "./Button";

const PairCard = ({ imageSrc, tokenName, marketCap, numReplies, ticker }) => {
  return (
    <Link 
      to="/Token/6" 
      className="block bg-n-8 border border-n-6 rounded-lg shadow-md overflow-hidden flex transition-transform transform hover:scale-105 hover:shadow-lg hover:border-purple-500 hover:bg-n-9"
    >
      {/* Image Section */}
      <div className="w-1/3 relative p-2">
        <img
          src={imageSrc || "https://via.placeholder.com/150"}
          alt="Token"
          className="w-full h-full object-cover rounded-l-lg"
        />
        <div className="absolute bottom-0 left-0 right-0 flex justify-around bg-n-7 py-2 px-2">
          <FaGlobe className="w-5 h-5 text-n-1" />
          <FaTelegram className="w-5 h-5 text-n-1" />
          <FaTwitter className="w-5 h-5 text-n-1" />
        </div>
      </div>

      {/* Details Section */}
      <div className="w-2/3 p-4">
        <h2 className="text-xl font-semibold text-n-1 mb-2">{tokenName}</h2>
        <p className="text-n-2 mb-1">Market Cap: {marketCap}</p>
        <p className="text-n-2 mb-1">Number of Replies: {numReplies}</p>
        <p className="text-n-2 mb-4">Ticker: {ticker}</p>
        <Button className="w-full">View Details</Button>
      </div>
    </Link>
  );
};

export default PairCard;
