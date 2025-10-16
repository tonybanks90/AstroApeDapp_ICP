import { useTheme } from '../../contexts/ThemeContext';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import {
  ckTESTBTCClient,
  BoostStatus,
  CKBoostErrorType,
  type BoostRequest,
  type DepositAddress,
  type TokenConfig
} from '@ckboost/client';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Copy, 
  ExternalLink,
  Sun,
  Moon
} from 'lucide-react';

const CKBoostWallet = () => {
  const { identity, isAuthenticated, principalId, login } = useAuth();
  const { theme, toggleTheme } = useTheme(); // Use the theme context

  // Client instance
  const [client] = useState(() => new ckTESTBTCClient({
    host: 'https://icp-api.io',
    timeout: 30000
  }));

  // State management
  const [activeTab, setActiveTab] = useState('deposit');
  const [depositAmount, setDepositAmount] = useState('');
  const [maxFee, setMaxFee] = useState(1.5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Deposit state
  const [depositInfo, setDepositInfo] = useState<DepositAddress | null>(null);
  const [activeRequests, setActiveRequests] = useState<BoostRequest[]>([]);
  const [monitoringIntervals, setMonitoringIntervals] = useState(new Map<string, NodeJS.Timeout>());

  // Token configuration
  const [tokenConfig, setTokenConfig] = useState<TokenConfig | null>(null);

  useEffect(() => {
    // Get token configuration on mount
    const config = client.getTokenConfig();
    setTokenConfig(config);

    // Load active requests on mount
    if (isAuthenticated) {
      loadActiveRequests();
    }

    return () => {
      // Cleanup monitoring intervals
      monitoringIntervals.forEach(interval => clearInterval(interval));
    };
  }, [isAuthenticated, principalId]); // Added principalId to dependency array

  const loadActiveRequests = async () => {
    try {
      const result = await client.getPendingBoostRequests();
      if (result.success && principalId) { // Ensure principalId is available
        // Filter requests to only show those owned by the current user
        const userRequests = result.data.filter(req => req.owner === principalId);
        
        setActiveRequests(userRequests);
        
        // Start monitoring each of the user's pending requests
        userRequests.forEach(request => {
          if (request.status === BoostStatus.PENDING || request.status === BoostStatus.ACTIVE) {
            startMonitoring(request.id);
          }
        });
      }
    } catch (err) {
      console.error('Failed to load active requests:', err);
    }
  };

  const startMonitoring = (requestId: string) => {
    // Don't start if already monitoring
    if (monitoringIntervals.has(requestId)) return;

    const interval = setInterval(async () => {
      const result = await client.getBoostRequest(requestId);
      if (result.success) {
        const request = result.data;

        // Update the request in our list
        setActiveRequests(prev =>
          prev.map(r => r.id === requestId ? request : r)
        );

        // Stop monitoring if completed
        if (request.status === BoostStatus.COMPLETED || request.status === BoostStatus.CANCELLED) {
          clearInterval(interval);
          setMonitoringIntervals(prev => {
            const newMap = new Map(prev);
            newMap.delete(requestId);
            return newMap;
          });
        }
      }
    }, 10000); // Poll every 10 seconds

    setMonitoringIntervals(prev => new Map(prev.set(requestId, interval)));
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!tokenConfig) {
      setError('Token configuration not loaded');
      return;
    }

    const amount = parseFloat(depositAmount);
    const minAmount = parseFloat(tokenConfig.minimumAmount);
    const maxAmount = parseFloat(tokenConfig.maximumAmount);

    if (amount < minAmount || amount > maxAmount) {
      setError(`Amount must be between ${minAmount} and ${maxAmount} ckTESTBTC`);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await client.generateDepositAddress({
        amount: depositAmount,
        maxFeePercentage: maxFee
      });

      if (result.success) {
        setDepositInfo(result.data);
        setSuccess('Deposit address generated successfully!');

        // Add to active requests and start monitoring
        const newRequest: BoostRequest = {
          id: result.data.requestId,
          status: BoostStatus.PENDING,
          amount: result.data.amount,
          receivedAmount: '0',
          maxFeePercentage: maxFee,
          confirmationsRequired: result.data.confirmationsRequired || 2,
          depositAddress: result.data.address,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          amountRaw: result.data.amountRaw,
          owner: principalId ?? '',
          explorerUrl: result.data.explorerUrl
        };

        setActiveRequests(prev => [newRequest, ...prev]);
        startMonitoring(result.data.requestId);

        // Clear form
        setDepositAmount('');
      } else {
        setError(getErrorMessage(result.error));
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (error: { type: CKBoostErrorType; message: string }) => {
    switch (error.type) {
      case CKBoostErrorType.INVALID_AMOUNT:
        return 'Invalid amount. Please check the minimum and maximum limits.';
      case CKBoostErrorType.NETWORK_ERROR:
        return 'Network error. Please check your connection and try again.';
      case CKBoostErrorType.CANISTER_ERROR:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 3000);
  };
  
  const getStatusColor = (status: BoostStatus) => {
    switch (status) {
      case BoostStatus.PENDING:
        return 'text-warning bg-warning/10';
      case BoostStatus.ACTIVE:
        return 'text-accent bg-accent/10';
      case BoostStatus.COMPLETED:
        return 'text-success bg-success/10';
      case BoostStatus.CANCELLED:
        return 'text-destructive bg-destructive/10';
      default:
        return 'text-muted-foreground bg-muted/10';
    }
  };

  const getStatusIcon = (status: BoostStatus) => {
    switch (status) {
      case BoostStatus.PENDING:
      case BoostStatus.ACTIVE:
        return <Clock className="w-4 h-4" />;
      case BoostStatus.COMPLETED:
        return <CheckCircle className="w-4 h-4" />;
      case BoostStatus.CANCELLED:
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-card rounded-lg shadow-lg animate-fade-in">
        <div className="text-center">
          <Wallet className="w-12 h-12 text-accent mx-auto mb-4" />
          <h2 className="text-xl font-bold text-card-foreground mb-4">CKBTC Fast Deposit</h2>
          <p className="text-muted-foreground mb-6">
            Connect your wallet to start using CKBTC-Fast-Depo acceleration services
          </p>
          <button
            onClick={login}
            className="w-full bg-accent text-accent-foreground py-2 px-4 rounded-lg hover:bg-accent/90 transition-colors"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-card rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Wallet className="w-8 h-8 text-accent" />
            <div>
              <h1 className="text-2xl font-bold text-card-foreground">CKTESTBTC-Deposit</h1>
              <p className="text-muted-foreground">Fast ckTESTBTC conversions under 10mins</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Connected as</p>
              <p className="font-mono text-sm text-foreground truncate max-w-[200px]">{principalId}</p>
            </div>
             <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-secondary">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg animate-slide-up">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-success/10 border border-success/20 text-success px-4 py-3 rounded-lg animate-slide-up">
          {success}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Actions */}
        <div className="lg:col-span-2 bg-card rounded-lg shadow-lg p-6">
          {/* Tabs */}
          <div className="flex space-x-1 mb-6">
            <button
              onClick={() => setActiveTab('deposit')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'deposit'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-secondary text-muted-foreground hover:bg-surface-light'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Deposit</span>
            </button>
            <button
              onClick={() => setActiveTab('withdraw')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'withdraw'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-secondary text-muted-foreground hover:bg-surface-light'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Withdraw</span>
            </button>
          </div>

          {/* Deposit Tab */}
          {activeTab === 'deposit' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-card-foreground mb-4">
                  Create Deposit Request
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Amount (ckTESTBTC)
                    </label>
                    <input
                      type="number"
                      step="0.00000001"
                      min={tokenConfig?.minimumAmount || "0"}
                      max={tokenConfig?.maximumAmount || "1"}
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full px-4 py-2 bg-secondary border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-accent"
                      placeholder="0.01"
                    />
                    {tokenConfig && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Min: {tokenConfig.minimumAmount}, Max: {tokenConfig.maximumAmount}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Maximum Fee ({maxFee}%)
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="2.0"
                      step="0.1"
                      value={maxFee}
                      onChange={(e) => setMaxFee(parseFloat(e.target.value))}
                      className="w-full accent-accent"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0.1%</span>
                      <span>2.0%</span>
                    </div>
                  </div>

                  <button
                    onClick={handleDeposit}
                    disabled={loading || !depositAmount}
                    className="w-full bg-accent text-accent-foreground py-3 px-4 rounded-lg hover:bg-accent/90 disabled:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {loading ? 'Creating Request...' : 'Generate Deposit Address'}
                  </button>
                </div>
              </div>

              {/* Deposit Info */}
              {depositInfo && (
                <div className="border border-border rounded-lg p-4 space-y-3 animate-slide-up">
                  <h4 className="font-semibold text-card-foreground">Deposit Information</h4>
                  
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Bitcoin Address:</label>
                      <div className="flex items-center space-x-2 mt-1">
                        <code className="bg-muted px-2 py-1 rounded text-sm font-mono break-all">
                          {depositInfo.address}
                        </code>
                        <button
                          onClick={() => copyToClipboard(depositInfo.address)}
                          className="text-accent hover:text-accent/90"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Amount (Satoshis):</label>
                      <p className="font-mono text-sm">{depositInfo.amountRaw}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Request ID:</label>
                      <p className="font-mono text-sm">{depositInfo.requestId}</p>
                    </div>

                    <a
                      href={depositInfo.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-accent hover:text-accent/90 text-sm"
                    >
                      <span>View on Explorer</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Withdraw Tab */}
          {activeTab === 'withdraw' && (
            <div className="space-y-6">
              <div className="text-center py-12 text-muted-foreground">
                <ArrowUpRight className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2 text-foreground">Withdrawal Feature</h3>
                <p>Standard ckTESTBTC withdrawals can be done through your wallet interface.</p>
                <p className="text-sm mt-2">CKBTC-Deposit focuses on accelerating deposits (Bitcoin → ckTESTBTC).</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Active Requests */}
        <div className="bg-card rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">Active Requests</h3>
          
          {activeRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No active requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeRequests.map((request) => (
                <div key={request.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {getStatusIcon(request.status)}
                      <span>{request.status}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(request.createdAt).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-mono">{request.amount} ckTESTBTC</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Received:</span>
                      <span className="font-mono">{request.receivedAmount} ckTESTBTC</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Progress:</span>
                      <span className="text-xs">
                        {((parseFloat(request.receivedAmount) / parseFloat(request.amount)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {request.depositAddress && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Deposit Address:</p>
                      <div className="flex items-center space-x-1">
                        <code className="text-xs font-mono bg-secondary px-1 rounded flex-1 truncate">
                          {request.depositAddress}
                        </code>
                        <button
                          onClick={() => request.depositAddress && copyToClipboard(request.depositAddress)}
                          className="text-accent hover:text-accent/90"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CKBoostWallet;