import React from 'react';
import tokenData from "../data/dataToken";


const Tokentopdetails = ({ tokenId }) => {
  const coininfo = tokenData.find((token) => token.id === Number(tokenId));

  if (!coininfo) {
    return <div className="text-red-500 text-center">Token not found</div>;
  }

  return (
    <div className="bg-n-8 border border-n-6 rounded-lg">
      {/* Coin Information */}
      <div className=" rounded-lg p-4 flex items-center space-x-4">
        <img src={coininfo.logo} alt="Logo" className="w-16 h-16 border border-n-6 rounded-lg" />
        <div>
          <h2 className="text-xl font-bold text-n-1">{coininfo.name}</h2>
          <p className="text-n-3">{coininfo.tagline}</p>
        </div>
        {/* Social Icons */}
      <div className="mt-4 flex space-x-4 justify-center">
        {coininfo.icons && (
          <>
            <a href={coininfo.twitterlink} target="_blank" rel="noopener noreferrer" className="text-n-3 hover:text-n-1">
              <img src={coininfo.icons.twitter} alt="Twitter" className="w-6 h-6" />
            </a>
            <a href={coininfo.telegramlink} target="_blank" rel="noopener noreferrer" className="text-n-3 hover:text-n-1">
              <img src={coininfo.icons.telegram} alt="Telegram" className="w-6 h-6" />
            </a>
            <a href={coininfo.websitelink} target="_blank" rel="noopener noreferrer" className="text-n-3 hover:text-n-1">
              <img src={coininfo.icons.website} alt="Website" className="w-6 h-6" />
            </a>
          </>
        )}
      </div>
         {/* Dev */}
      <div className="mt-4 text-center text-color-1 font-bold border border-n-6 rounded-lg p-4">
        Dev: {coininfo.dev}
      </div>
      </div>
      
      </div>
);

};

export default Tokentopdetails;