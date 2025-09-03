import React, { useState } from 'react';
import { useCustomTokenBalance } from '../hooks/useQueries.js';
import { Coins, Search, AlertTriangle, RefreshCw, Info } from 'lucide-react';

interface CustomTokenBalanceProps {
  principalId: string;
}

export default function CustomTokenBalance({ principalId }: CustomTokenBalanceProps) {
  const [canisterId, setCanisterId] = useState('');
  const [queryCanisterId, setQueryCanisterId] = useState('');
  
  const { data: tokenData, isLoading, error, refetch, isRefetching } = useCustomTokenBalance(
    principalId, 
    queryCanisterId
  );

  const handleQuery = () => {
    if (canisterId.trim()) {
      setQueryCanisterId(canisterId.trim());
    }
  };

  const handleRefresh = () => {
    if (queryCanisterId) {
      refetch();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleQuery();
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <Coins className="h-5 w-5 mr-2 text-blue-400" />
          Custom ICRC-2 Token Balance
        </h3>
        {queryCanisterId && (
          <button
            onClick={handleRefresh}
            disabled={isRefetching}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded"
            title="Refresh balance"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={canisterId}
            onChange={(e) => setCanisterId(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter ICRC-2 token canister ID"
            className="flex-1 px-4 py-2 bg-slate-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleQuery}
            disabled={!canisterId.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span>{isLoading ? 'Querying...' : 'Query'}</span>
          </button>
        </div>

        {queryCanisterId && (
          <div className="p-4 bg-slate-700/50 rounded-lg">
            <div className="text-sm text-gray-400 mb-4">
              Canister ID: <span className="font-mono text-gray-300">{queryCanisterId}</span>
            </div>
            
            {isLoading ? (
              <div className="flex items-center space-x-2 text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
                <span>Loading token information...</span>
              </div>
            ) : error ? (
              <div className="flex items-center space-x-2 text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">
                  {error instanceof Error ? error.message : 'Failed to fetch token information'}
                </span>
              </div>
            ) : tokenData ? (
              <div className="space-y-4">
                {/* Token Metadata Section */}
                <div className="bg-slate-600/30 rounded-lg p-4 border border-slate-600/50">
                  <div className="flex items-center space-x-2 mb-3">
                    <Info className="h-4 w-4 text-blue-400" />
                    <h4 className="text-white font-medium">Token Information</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Name</div>
                      <div className="text-white font-medium">{tokenData.metadata.name || 'Unknown'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Symbol</div>
                      <div className="text-white font-medium">{tokenData.metadata.symbol || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Decimals</div>
                      <div className="text-white font-medium">{tokenData.metadata.decimals}</div>
                    </div>
                  </div>
                </div>

                {/* Balance Section */}
                <div className="bg-slate-600/30 rounded-lg p-4 border border-slate-600/50">
                  <div className="flex items-center space-x-2 mb-3">
                    <Coins className="h-4 w-4 text-green-400" />
                    <h4 className="text-white font-medium">Your Balance</h4>
                  </div>
                  <div>
                    <div className="text-white font-semibold text-xl mb-1">
                      {tokenData.balance.balance.toFixed(8)} {tokenData.metadata.symbol || 'tokens'}
                    </div>
                    <div className="text-gray-400 text-sm space-y-1">
                      <div>Raw balance: {tokenData.balance.rawBalance}</div>
                      <div>Formatted with {tokenData.metadata.decimals} decimal places</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        <div className="text-xs text-gray-500">
          Enter any ICRC-2 compatible token canister ID to query token information and your balance
        </div>
      </div>
    </div>
  );
}
