import React from "react";

const TokenDistributionCard = () => {
  // Demo data for token distribution
  const distributionData = [
    { address: "0x1234...abcd", percentage: "25%", tag: "Bonding Curve" },
    { address: "0x5678...efgh", percentage: "20%", tag: "Dev" },
    { address: "0x9101...ijkl", percentage: "15%" },
    { address: "0x1112...mnop", percentage: "10%" },
    { address: "0x1314...qrst", percentage: "8%" },
    { address: "0x1516...uvwx", percentage: "7%" },
    { address: "0x1718...yz01", percentage: "6%" },
    { address: "0x1920...2345", percentage: "5%" },
    { address: "0x2122...6789", percentage: "3%" },
    { address: "0x2324...abcd", percentage: "1%" },
  ];

  return (
    <div className="bg-n-8 border border-n-6 rounded-lg p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-n-1 mb-6">Token Distribution</h2>

      <div className="grid grid-cols-2 gap-4 border-b border-n-6 pb-2 mb-4">
        <span className="text-lg font-medium text-n-1">Holder Address</span>
        <span className="text-lg font-medium text-n-1">Distribution %</span>
      </div>

      <ul className="space-y-4">
        {distributionData.map((holder, index) => (
          <li
            key={index}
            className="grid grid-cols-2 gap-4 border-b border-n-6 pb-2"
          >
            <div className="flex items-center">
              <span className="text-n-1">{holder.address}</span>
              {holder.tag && (
                <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                  {holder.tag}
                </span>
              )}
            </div>
            <span className="text-n-1 text-right">{holder.percentage}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TokenDistributionCard;
