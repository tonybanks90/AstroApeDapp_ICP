import React from 'react';
import { useCryptoBalances } from '../hooks/useQueries.js';
import { Bitcoin, DollarSign, AlertTriangle, RefreshCw } from 'lucide-react';

interface CryptoBalancesProps {
  principalId: string;
}

const cryptoIcons: Record<string, React.ReactNode> = {
  ckBTC: <Bitcoin className="h-6 w-6 text-orange-400" />,
  ckETH: <div className="h-6 w-6 bg-blue-400 rounded-full flex items-center justify-center text-xs font-bold text-white">Ξ</div>,
  ckTESTBTC: <Bitcoin className="h-6 w-6 text-yellow-400" />,
  cksepoliaETH: <div className="h-6 w-6 bg-green-400 rounded-full flex items-center justify-center text-xs font-bold text-white">Ξ</div>,
};

const cryptoNames: Record<string, string> = {
  ckBTC: 'ckBTC',
  ckETH: 'ckETH',
  ckTESTBTC: 'ckTESTBTC',
  cksepoliaETH: 'cksepoliaETH',
};

const formatBalance = (balance: number, crypto: string) => {
  if (crypto === 'ckBTC' || crypto === 'ckTESTBTC') {
    const satoshi = Math.round(balance * 100_000_000);
    return {
      main: `${balance.toFixed(8)} BTC`,
      converted: `${satoshi.toLocaleString()} satoshi`
    };
  } else if (crypto === 'ckETH' || crypto === 'cksepoliaETH') {
    const wei = BigInt(Math.round(balance * 1e18));
    return {
      main: `${balance.toFixed(8)} ETH`,
      converted: `${wei.toLocaleString()} wei`
    };
  }
  return {
    main: balance.toFixed(4),
    converted: null
  };
};

export default function CryptoBalances({ principalId }: CryptoBalancesProps) {
  const { data: balances, isLoading, error, refetch, isRefetching } = useCryptoBalances(principalId);

  const handleRefresh = () => {
    console.log('[CryptoBalances] Manual refresh triggered');
    refetch();
  };

  if (isLoading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl lg:mt-12 p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <DollarSign className="h-5 w-5 mr-2 text-green-400" />
          Wallet Balances
        </h3>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-6 w-6 bg-gray-600 rounded-full animate-pulse" />
                <div className="h-4 w-16 bg-gray-600 rounded animate-pulse" />
              </div>
              <div className="text-right">
                <div className="h-4 w-20 bg-gray-600 rounded animate-pulse mb-1" />
                <div className="h-3 w-16 bg-gray-600 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <DollarSign className="h-5 w-5 mr-2 text-green-400" />
          Wallet Balances
        </h3>
        <div className="flex items-center justify-center p-8 text-center">
          <div>
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
            <p className="text-red-400 font-medium mb-2">Failed to load balances</p>
            <p className="text-gray-400 text-sm mb-4">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
            <button
              onClick={handleRefresh}
              disabled={isRefetching}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 mx-auto"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span>{isRefetching ? 'Retrying...' : 'Retry'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasAnyErrors = balances && Object.values(balances).some(balance => balance.error);

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <DollarSign className="h-5 w-5 mr-2 text-green-400" />
          Wallet Balances
        </h3>
        <button
          onClick={handleRefresh}
          disabled={isRefetching}
          className="text-gray-400 hover:text-white transition-colors p-1 rounded"
          title="Refresh balances"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {hasAnyErrors && (
        <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
          <div className="flex items-center space-x-2 text-yellow-400 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>Some balances could not be loaded</span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {balances && Object.entries(balances).map(([crypto, balanceData]) => {
          const formattedBalance = formatBalance(balanceData.balance, crypto);
          
          return (
            <div key={crypto} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700/70 transition-colors">
              <div className="flex items-center space-x-3">
                {cryptoIcons[crypto]}
                <span className="text-gray-300 font-medium">{cryptoNames[crypto]}</span>
              </div>
              <div className="text-right">
                {balanceData.error ? (
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-red-400 text-sm">Error</span>
                  </div>
                ) : (
                  <div>
                    <div className="text-white font-semibold">
                      {formattedBalance.main}
                    </div>
                    {formattedBalance.converted && (
                      <div className="text-gray-400 text-xs">
                        {formattedBalance.converted}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        Balances are fetched from live IC network canisters
      </div>
    </div>
  );
}
