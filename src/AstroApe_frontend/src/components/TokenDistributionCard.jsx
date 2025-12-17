import React from "react";

const TokenDistributionCard = ({ holders }) => {
  // Sort holders by balance (descending)
  const sortedHolders = holders ? [...holders].sort((a, b) => Number(b[1]) - Number(a[1])) : [];

  // Calculate total supply from holders to determine percentage
  const totalSupply = sortedHolders.reduce((acc, [_, bal]) => acc + Number(bal), 0);

  return (
    <div className="bg-n-8 border border-n-6 rounded-lg p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-n-1 mb-6">Token Distribution</h2>

      <div className="grid grid-cols-2 gap-4 border-b border-n-6 pb-2 mb-4">
        <span className="text-lg font-medium text-n-1">Holder Address</span>
        <span className="text-lg font-medium text-n-1 text-right">Balance</span>
      </div>

      <ul className="space-y-4">
        {sortedHolders.length > 0 ? (
          sortedHolders.map(([principal, balance], index) => (
            <li
              key={index}
              className="grid grid-cols-2 gap-4 border-b border-n-6 pb-2"
            >
              <div className="flex items-center">
                <span className="text-n-1 truncate max-w-[150px]" title={principal.toString()}>
                  {principal.toString()}
                </span>
                {index === 0 && (
                  <span className="ml-2 bg-color-1 text-white text-xs px-2 py-1 rounded">
                    Top
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-n-1 block">{Number(balance).toLocaleString()}</span>
                <span className="text-xs text-n-3">
                  {totalSupply > 0 ? ((Number(balance) / totalSupply) * 100).toFixed(2) : 0}%
                </span>
              </div>
            </li>
          ))
        ) : (
          <li className="text-center text-n-4">No holders found</li>
        )}
      </ul>
    </div>
  );
};

export default TokenDistributionCard;
