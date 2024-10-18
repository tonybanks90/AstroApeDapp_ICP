import React from 'react';
import { companyLogos } from '../constants';

const CoinDetails = () => {
  return (
    <div className="bg-n-8 border border-n-6 rounded-lg p-4">
      {/* Banner */}
      <div className="relative bg-blue-500 text-white rounded-lg overflow-hidden">
        <img src="path-to-your-banner-image" alt="Banner" className="w-full h-32 object-cover" />
        <div className="absolute inset-0 flex items-center justify-center">
          <img src="path-to-your-logo" alt="Logo" className="w-24 h-24 rounded-full" />
        </div>
      </div>

      {/* Coin Information */}
      <div className="mt-4">
        <h2 className="text-xl font-bold text-n-1">APE TOKEN (APE)</h2>
        <div className="mt-2">
          <p className="text-n-1">Dev: [dev wallet address]</p>
          <p className="text-n-1">Dex: UNISWAP</p>
          <p className="text-n-1">Address: [Token address]</p>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-4">
        <p className="text-n-1">Progress: 100%</p>
        <div className="relative w-full bg-n-7 rounded-full h-4">
          <div
            className="absolute top-0 left-0 h-full bg-purple-500 rounded-full"
            style={{ width: '100%' }}
          ></div>
        </div>
      </div>

      {/* Flex Details */}
      <div className="mt-4 flex justify-between text-n-1">
        <div>
          <p>Market Cap: $69K</p>
        </div>
        <div>
          <p>Virtual LP: $21K</p>
        </div>
        <div>
          <p>Progress: 100%</p>
        </div>
        <div>
          <p>Volume: $45K</p>
        </div>
      </div>
    </div>
  );
};

export default CoinDetails;
