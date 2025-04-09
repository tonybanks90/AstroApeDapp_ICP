import React from "react";
import { FaGlobe, FaTelegram, FaTwitter } from "react-icons/fa";
import Button from "./Button";
import { Link } from "react-router-dom"; // Import Link



const PairCard = ({ id, logo, name, xmarketCap, numReplies, ticker }) => {
  console.log("PairCard ID:", id); // Debugging output
  return (
    <Link to={`/Token/swap/${id}`} className="block">
      <div className="bg-n-8 border border-n-6 rounded-lg shadow-md overflow-hidden flex transition-transform transform hover:scale-105 hover:shadow-lg hover:border-purple-500 hover:bg-n-9">
        {/* Image Section */}
        <div className="w-1/3 relative p-2">
          <img
            src={logo}
            alt={name}
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
          <h2 className="text-xl font-semibold text-n-1 mb-2">{name}</h2>
          <p className="text-n-2 mb-1">xMarket Cap: {xmarketCap}</p>
          <p className="text-n-2 mb-1">Replies: {numReplies}</p>
          <p className="text-n-2 mb-4">Ticker: {ticker}</p>
          <Button className="w-full">View Details</Button>
        </div>
      </div>
    </Link>
  );
};

export default PairCard;
