import React, { useState, useEffect } from 'react';
import { useSiweIdentity } from 'ic-use-siwe-identity';
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
  ExternalLink
} from 'lucide-react';
import { Button } from './booster/Button.js';
import { Card, CardHeader, CardTitle } from './booster/Card.js';
import { Alert } from './booster/Alert.js';
import { Input, RangeInput } from './booster/Input.js';

// Helper to get storage key for user requests
const getUserRequestsKey = (principalId: string) => `ckboost_requests_${principalId}`;

// Helper to load user requests from localStorage
const loadUserRequests = (principalId: string): string[] => {
  try {
    const stored = localStorage.getItem(getUserRequestsKey(principalId));
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading user requests from storage:', error);
    return [];
  }
};

// Helper to save user requests to localStorage
const saveUserRequests = (principalId: string, requestIds: string[]) => {
  try {
    localStorage.setItem(getUserRequestsKey(principalId), JSON.stringify(requestIds));
    console.log(`Saved ${requestIds.length} request IDs for user ${principalId}`);
  } catch (error) {
    console.error('Error saving user requests to storage:', error);
  }
};

// Helper to add a request ID to user's list
const addUserRequest = (principalId: string, requestId: string) => {
  const existing = loadUserRequests(principalId);
  if (!existing.includes(requestId)) {
    existing.push(requestId);
    saveUserRequests(principalId, existing);
  }
};

// Helper to remove a request ID from user's list
const removeUserRequest = (principalId: string, requestId: string) => {
  const existing = loadUserRequests(principalId);
  const updated = existing.filter(id => id !== requestId);
  saveUserRequests(principalId, updated);
};

const CKBoostWallet = () => {
  const { identity, isInitializing } = useSiweIdentity();

  // Derived state from identity
  const isAuthenticated = !!identity;
  const principalId = identity ? identity.getPrincipal().toText() : null;

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

  // Load token config on mount
  useEffect(() => {
    const config = client.getTokenConfig();
    setTokenConfig(config);
    console.log('CKBoost token config loaded:', config);
  }, [client]);

  // Handle authentication changes and load requests
  useEffect(() => {
    if (isAuthenticated && principalId) {
      console.log('User authenticated, loading user requests for:', principalId);
      loadUserRequestsFromStorage();
    } else {
      console.log('User not authenticated, clearing requests');
      setActiveRequests([]);
      setDepositInfo(null);
      monitoringIntervals.forEach(interval => clearInterval(interval));
      setMonitoringIntervals(new Map());
    }

    return () => {
      monitoringIntervals.forEach(interval => clearInterval(interval));
    };
  }, [isAuthenticated, principalId]);

  const loadUserRequestsFromStorage = async () => {
    if (!principalId) {
      console.log('Cannot load requests: No principal ID');
      return;
    }

    try {
      // Get user's request IDs from localStorage
      const userRequestIds = loadUserRequests(principalId);
      console.log(`Found ${userRequestIds.length} stored request IDs for user`);

      if (userRequestIds.length === 0) {
        setActiveRequests([]);
        return;
      }

      // Fetch each request from the backend
      const requests: BoostRequest[] = [];
      const invalidRequestIds: string[] = [];

      for (const requestId of userRequestIds) {
        console.log(`Fetching request: ${requestId}`);
        const result = await client.getBoostRequest(requestId);
        
        if (result.success) {
          requests.push(result.data);
          console.log(`Request ${requestId} status: ${result.data.status}`);

          // Start monitoring if still active
          if (result.data.status === BoostStatus.PENDING || result.data.status === BoostStatus.ACTIVE) {
            startMonitoring(requestId);
          } else if (result.data.status === BoostStatus.COMPLETED || result.data.status === BoostStatus.CANCELLED) {
            // Optionally remove completed/cancelled requests after some time
            console.log(`Request ${requestId} is ${result.data.status}, keeping in list`);
          }
        } else {
          console.error(`Failed to fetch request ${requestId}:`, result.error);
          // If request not found, mark for removal
          if (result.error.type === CKBoostErrorType.REQUEST_NOT_FOUND) {
            invalidRequestIds.push(requestId);
          }
        }
      }

      // Clean up invalid request IDs
      if (invalidRequestIds.length > 0) {
        console.log(`Removing ${invalidRequestIds.length} invalid request IDs`);
        invalidRequestIds.forEach(id => removeUserRequest(principalId, id));
      }

      setActiveRequests(requests);
      console.log(`Loaded ${requests.length} active requests`);
    } catch (err) {
      console.error('Failed to load user requests:', err);
    }
  };

  const startMonitoring = (requestId: string) => {
    if (monitoringIntervals.has(requestId)) {
      console.log(`Already monitoring request: ${requestId}`);
      return;
    }

    console.log(`Starting monitoring for request: ${requestId}`);
    const interval = setInterval(async () => {
      const result = await client.getBoostRequest(requestId);
      if (result.success) {
        const request = result.data;

        setActiveRequests(prev =>
          prev.map(r => r.id === requestId ? request : r)
        );

        if (request.status === BoostStatus.COMPLETED || request.status === BoostStatus.CANCELLED) {
          console.log(`Request ${requestId} completed/cancelled, stopping monitoring`);
          clearInterval(interval);
          setMonitoringIntervals(prev => {
            const newMap = new Map(prev);
            newMap.delete(requestId);
            return newMap;
          });
        }
      }
    }, 10000);

    setMonitoringIntervals(prev => new Map(prev.set(requestId, interval)));
  };

  const handleDeposit = async () => {
    if (!principalId) {
      setError('Please ensure you are logged in');
      return;
    }

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
      console.log('=== CREATING NEW DEPOSIT ===');
      console.log('Amount:', depositAmount);
      console.log('Max Fee:', maxFee);
      console.log('Current Principal:', principalId);
      
      const result = await client.generateDepositAddress({
        amount: depositAmount,
        maxFeePercentage: maxFee
      });

      if (result.success) {
        console.log('Deposit address generated successfully:', result.data);
        setDepositInfo(result.data);
        setSuccess('Deposit address generated successfully!');

        // Create the request object
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
          explorerUrl: result.data.explorerUrl,
          owner: ''
        };

        console.log('New request created with ID:', newRequest.id);

        // Save request ID to localStorage
        addUserRequest(principalId, result.data.requestId);
        console.log('Request ID saved to localStorage');

        // Add to active requests immediately
        setActiveRequests(prev => [newRequest, ...prev]);
        
        // Start monitoring
        startMonitoring(result.data.requestId);
        
        // Clear form
        setDepositAmount('');

      } else {
        setError(getErrorMessage(result.error));
        console.error('Error generating deposit address:', result.error);
      }
    } catch (err) {
      console.error('Network error during deposit:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRequest = (requestId: string) => {
    if (!principalId) return;
    
    // Remove from localStorage
    removeUserRequest(principalId, requestId);
    
    // Remove from state
    setActiveRequests(prev => prev.filter(r => r.id !== requestId));
    
    // Stop monitoring
    const interval = monitoringIntervals.get(requestId);
    if (interval) {
      clearInterval(interval);
      setMonitoringIntervals(prev => {
        const newMap = new Map(prev);
        newMap.delete(requestId);
        return newMap;
      });
    }
    
    setSuccess('Request removed');
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
        return 'text-color-2 bg-color-2/10';
      case BoostStatus.ACTIVE:
        return 'text-color-1 bg-color-1/10';
      case BoostStatus.COMPLETED:
        return 'text-color-4 bg-color-4/10';
      case BoostStatus.CANCELLED:
        return 'text-color-3 bg-color-3/10';
      default:
        return 'text-n-3 bg-n-6';
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

  if (isInitializing) {
    return (
      <div className="container max-w-md mx-auto mt-10">
        <Card>
          <div className="text-center py-8">
            <div className="inline-block p-4 bg-n-6 rounded-2xl mb-4">
              <Wallet className="w-12 h-12 text-n-4 animate-pulse" />
            </div>
            <p className="body-2 text-n-3">Initializing wallet...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container max-w-md mx-auto lg:pt-24 pt-20 pb-16 ">
        <Card>
          <div className="text-center">
            <Wallet className="w-16 h-16 text-color-1 mx-auto mb-6" />
            <h2 className="h3 text-n-1 mb-4">CKBTC Fast Deposit</h2>
            <p className="body-2 text-n-3 mb-8">
              Connect your wallet to start using CKBTC-Fast-Depo acceleration services
            </p>
            <div className="text-center text-n-4 text-sm">
              <p>Please connect your wallet using the navigation menu</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      {/* Header */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-color-1 to-color-2 rounded-2xl">
              <Wallet className="w-8 h-8 text-n-8" />
            </div>
            <div>
              <h1 className="h2 text-n-1">CKTESTBTC-Deposit</h1>
              <p className="body-2 text-n-3">Fast ckTESTBTC conversions under 10mins</p>
            </div>
          </div>
          <div className="text-left md:text-right">
            <p className="caption text-n-4 uppercase tracking-wider mb-1">Connected as</p>
            <p className="font-code text-sm text-n-2 truncate max-w-[250px]" title={principalId || ''}>
              {principalId}
            </p>
          </div>
        </div>
      </Card>

      {/* Alerts */}
      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Actions */}
        <div className="lg:col-span-2">
          <Card>
            {/* Tabs */}
            <div className="flex space-x-2 mb-8 p-1 bg-n-8 rounded-2xl">
              <button
                onClick={() => setActiveTab('deposit')}
                className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-code text-xs uppercase tracking-wider transition-all ${
                  activeTab === 'deposit'
                    ? 'bg-color-1 text-n-8'
                    : 'text-n-3 hover:text-n-1'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Deposit</span>
              </button>
              <button
                onClick={() => setActiveTab('withdraw')}
                className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-code text-xs uppercase tracking-wider transition-all ${
                  activeTab === 'withdraw'
                    ? 'bg-color-1 text-n-8'
                    : 'text-n-3 hover:text-n-1'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Withdraw</span>
              </button>
            </div>

            {/* Deposit Tab */}
            {activeTab === 'deposit' && (
              <div className="space-y-8">
                <div>
                  <CardTitle className="mb-6">Create Deposit Request</CardTitle>
                  
                  <div className="space-y-6">
                    <Input
                      type="number"
                      step="0.00000001"
                      min={tokenConfig?.minimumAmount || "0"}
                      max={tokenConfig?.maximumAmount || "1"}
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      label="Amount (ckTESTBTC)"
                      placeholder="0.01"
                      helperText={tokenConfig ? `Min: ${tokenConfig.minimumAmount}, Max: ${tokenConfig.maximumAmount}` : ''}
                    />

                    <RangeInput
                      label="Maximum Fee"
                      value={maxFee}
                      min={0.1}
                      max={2.0}
                      step={0.1}
                      onChange={setMaxFee}
                      displayValue={`${maxFee}%`}
                    />

                    <Button
                      onClick={handleDeposit}
                      disabled={loading || !depositAmount}
                      className="w-full"
                    >
                      {loading ? 'Creating Request...' : 'Generate Deposit Address'}
                    </Button>
                  </div>
                </div>

                {/* Deposit Info */}
                {depositInfo && (
                  <div className="border border-n-6 rounded-2xl p-6 space-y-4 bg-n-8">
                    <h4 className="h6 text-n-1">Deposit Information</h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="caption text-n-3 uppercase tracking-wider mb-2 block">Bitcoin Address:</label>
                        <div className="flex items-center space-x-2">
                          <code className="flex-1 bg-n-7 px-4 py-2 rounded-lg text-sm font-code text-n-2 break-all">
                            {depositInfo.address}
                          </code>
                          <button
                            onClick={() => copyToClipboard(depositInfo.address)}
                            className="p-2 text-color-1 hover:text-color-2 transition-colors"
                          >
                            <Copy className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="caption text-n-3 uppercase tracking-wider mb-2 block">Amount (Satoshis):</label>
                        <p className="font-code text-n-1">{depositInfo.amountRaw}</p>
                      </div>

                      <div>
                        <label className="caption text-n-3 uppercase tracking-wider mb-2 block">Request ID:</label>
                        <p className="font-code text-sm text-n-2 break-all">{depositInfo.requestId}</p>
                      </div>

                      <a
                        href={depositInfo.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-color-1 hover:text-color-2 transition-colors"
                      >
                        <span className="button">View on Explorer</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Withdraw Tab */}
            {activeTab === 'withdraw' && (
              <div className="text-center py-16">
                <div className="inline-block p-4 bg-n-6 rounded-2xl mb-6">
                  <ArrowUpRight className="w-12 h-12 text-n-4" />
                </div>
                <h3 className="h5 text-n-1 mb-3">Withdrawal Feature</h3>
                <p className="body-2 text-n-3 max-w-md mx-auto mb-2">
                  Standard ckTESTBTC withdrawals can be done through your wallet interface.
                </p>
                <p className="caption text-n-4">
                  CKBTC-Deposit focuses on accelerating deposits (Bitcoin → ckTESTBTC).
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Right Panel - Active Requests */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>My Requests</CardTitle>
            </CardHeader>
            
            {activeRequests.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-block p-4 bg-n-6 rounded-2xl mb-4">
                  <Clock className="w-8 h-8 text-n-4" />
                </div>
                <p className="body-2 text-n-3">No active requests</p>
                <p className="caption text-n-4 mt-2">Create a deposit to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    getStatusColor={getStatusColor}
                    getStatusIcon={getStatusIcon}
                    copyToClipboard={copyToClipboard}
                    onRemove={handleRemoveRequest}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

// Request Card Component
interface RequestCardProps {
  request: BoostRequest;
  getStatusColor: (status: BoostStatus) => string;
  getStatusIcon: (status: BoostStatus) => React.ReactNode;
  copyToClipboard: (text: string) => void;
  onRemove: (requestId: string) => void;
}

const RequestCard: React.FC<RequestCardProps> = ({ 
  request, 
  getStatusColor, 
  getStatusIcon, 
  copyToClipboard,
  onRemove
}) => {
  const progress = (parseFloat(request.receivedAmount) / parseFloat(request.amount)) * 100;
  const isCompleted = request.status === BoostStatus.COMPLETED || request.status === BoostStatus.CANCELLED;

  return (
    <div className="border border-n-6 rounded-2xl p-4 bg-n-8">
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-code uppercase tracking-wider ${getStatusColor(request.status)}`}>
          {getStatusIcon(request.status)}
          <span>{request.status}</span>
        </span>
        <span className="caption text-n-4">
          {new Date(request.createdAt).toLocaleString()}
        </span>
      </div>
      
      <div className="space-y-2 text-sm mb-3">
        <div className="flex justify-between items-center">
          <span className="text-n-3">Amount:</span>
          <span className="font-code text-n-1">{request.amount} ckTESTBTC</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-n-3">Received:</span>
          <span className="font-code text-n-1">{request.receivedAmount} ckTESTBTC</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-n-3">Progress:</span>
          <span className="text-color-1 font-code">
            {progress.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-n-6 rounded-full overflow-hidden mb-3">
        <div 
          className="h-full bg-gradient-to-r from-color-1 to-color-2 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {request.depositAddress && (
        <div className="pt-3 border-t border-n-6 mb-3">
          <p className="caption text-n-4 uppercase tracking-wider mb-2">Deposit Address:</p>
          <div className="flex items-center space-x-2">
            <code className="text-xs font-code bg-n-7 px-2 py-1 rounded flex-1 truncate text-n-2">
              {request.depositAddress}
            </code>
            <button
              onClick={() => copyToClipboard(request.depositAddress!)}
              className="text-color-1 hover:text-color-2 transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Remove button for completed/cancelled requests */}
      {isCompleted && (
        <button
          onClick={() => onRemove(request.id)}
          className="w-full text-xs text-n-4 hover:text-n-2 transition-colors py-2 border-t border-n-6"
        >
          Remove from list
        </button>
      )}
    </div>
  );
};

export default CKBoostWallet;