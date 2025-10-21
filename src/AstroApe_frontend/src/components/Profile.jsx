import React, { useState, useEffect } from 'react';
import { useSiweIdentity } from 'ic-use-siwe-identity';
import { useCryptoBalances } from '../hooks/useQueries';
import { 
  Wallet, 
  User, 
  Settings, 
  Copy,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

// Reusable Components
const Button = ({ 
  variant = 'primary', 
  children, 
  className = '',
  disabled,
  ...props 
}) => {
  const baseStyles = "button relative inline-flex items-center justify-center h-11 px-7 rounded-xl transition-all font-code text-xs uppercase tracking-wider";
  
  const variants = {
    primary: "text-n-8 bg-color-1 hover:bg-color-2 disabled:bg-n-5 disabled:text-n-4",
    secondary: "text-n-1 bg-n-6 border border-n-5 hover:bg-n-5 disabled:opacity-50",
    ghost: "text-color-1 hover:text-color-2 hover:bg-n-7"
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${disabled ? 'cursor-not-allowed' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-n-7 border border-n-6 rounded-2xl p-6 ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children }) => (
  <div className="mb-6">{children}</div>
);

const CardTitle = ({ children, className = '' }) => (
  <h3 className={`h6 text-n-1 ${className}`}>{children}</h3>
);

const Input = ({ 
  label, 
  helperText, 
  className = '',
  ...props 
}) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block caption text-n-3 uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        className={`w-full px-5 py-3.5 bg-n-6 border border-n-5 rounded-xl text-n-1 placeholder:text-n-4 focus:border-color-1 focus:outline-none transition-colors ${className}`}
        {...props}
      />
      {helperText && (
        <p className="caption text-n-4">{helperText}</p>
      )}
    </div>
  );
};

const Alert = ({ type, children, className = '' }) => {
  const styles = {
    success: 'bg-color-4/10 border-color-4/30 text-color-4',
    error: 'bg-color-3/10 border-color-3/30 text-color-3',
    info: 'bg-color-1/10 border-color-1/30 text-color-1'
  };

  const icons = {
    success: '✓',
    error: '⚠',
    info: 'ℹ'
  };

  return (
    <div className={`p-4 border rounded-2xl flex items-start space-x-3 ${styles[type]} ${className}`}>
      <div className="flex-shrink-0 mt-0.5 font-bold">
        {icons[type]}
      </div>
      <div className="body-2 flex-1">
        {children}
      </div>
    </div>
  );
};

// Edit Profile Modal Component
const EditProfileModal = ({ 
  currentUsername, 
  currentBio, 
  currentProfilePic, 
  onClose, 
  onSave 
}) => {
  const [username, setUsername] = useState(currentUsername);
  const [bio, setBio] = useState(currentBio);
  const [profilePic, setProfilePic] = useState(currentProfilePic);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setLoading(true);
    setError('');
    
    try {
      await onSave({ username, bio, profilePic });
      onClose();
    } catch (err) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-n-8/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
        </CardHeader>

        {error && <Alert type="error" className="mb-4">{error}</Alert>}

        <div className="space-y-6">
          <Input
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
          />

          <Input
            label="Profile Picture URL"
            value={profilePic}
            onChange={(e) => setProfilePic(e.target.value)}
            placeholder="https://..."
          />

          <div className="space-y-2">
            <label className="block caption text-n-3 uppercase tracking-wider">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={4}
              className="w-full px-5 py-3.5 bg-n-6 border border-n-5 rounded-xl text-n-1 placeholder:text-n-4 focus:border-color-1 focus:outline-none transition-colors resize-none"
            />
          </div>

          <div className="flex space-x-4">
            <Button onClick={handleSave} disabled={loading} className="flex-1">
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button onClick={onClose} variant="secondary" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Balance Card Component
const BalanceCard = ({ symbol, balance, isLoading, error }) => {
  const getTokenColor = (symbol) => {
    const colors = {
      ckBTC: 'text-color-1',
      ckETH: 'text-color-2',
      ckTESTBTC: 'text-color-1',
      cksepoliaETH: 'text-color-2'
    };
    return colors[symbol] || 'text-n-1';
  };

  return (
    <div className="bg-n-8 border border-n-6 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="caption text-n-3 uppercase tracking-wider">{symbol}</span>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-color-1 to-color-2 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-n-8" />
        </div>
      </div>
      
      {isLoading ? (
        <div className="h-8 bg-n-6 rounded animate-pulse" />
      ) : error ? (
        <p className="text-sm text-color-3">Error loading</p>
      ) : (
        <p className={`text-2xl font-code font-bold ${getTokenColor(symbol)}`}>
          {balance.toFixed(8)}
        </p>
      )}
    </div>
  );
};

// Main Profile Component
const Profile = () => {
  const { identity, isInitializing } = useSiweIdentity();
  
  const isAuthenticated = !!identity;
  const principalId = identity ? identity.getPrincipal().toText() : null;

  // Fetch crypto balances
  const { data: balances, isLoading: balancesLoading, error: balancesError, refetch } = useCryptoBalances(principalId || '');

  // Profile state
  const [username, setUsername] = useState('Web3 User');
  const [bio, setBio] = useState('Building on the Internet Computer');
  const [profilePic, setProfilePic] = useState('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQtoagYg1XvNp0KTskjA_F7TqVLEvkWqmPYqQ&s');
  
  // UI state
  const [isEditing, setIsEditing] = useState(false);
  const [success, setSuccess] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Principal ID copied to clipboard!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleRefreshBalances = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleSaveProfile = async (updatedData) => {
    setUsername(updatedData.username);
    setBio(updatedData.bio);
    setProfilePic(updatedData.profilePic);
    setSuccess('Profile updated successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  if (isInitializing) {
    return (
      <div className="container max-w-4xl mx-auto mt-10">
        <Card>
          <div className="text-center py-8">
            <div className="inline-block p-4 bg-n-6 rounded-2xl mb-4">
              <User className="w-12 h-12 text-n-4 animate-pulse" />
            </div>
            <p className="body-2 text-n-3">Loading profile...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container max-w-4xl mx-auto mt-10">
        <Card>
          <div className="text-center py-12">
            <div className="inline-block p-6 bg-gradient-to-br from-color-1 to-color-2 rounded-2xl mb-6">
              <User className="w-16 h-16 text-n-8" />
            </div>
            <h2 className="h3 text-n-1 mb-4">Web3 Profile</h2>
            <p className="body-2 text-n-3 mb-2">
              Connect your wallet to access your decentralized profile
            </p>
            <p className="caption text-n-4">
              Please use the navigation menu to connect
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      {/* Success Alert */}
      {success && <Alert type="success">{success}</Alert>}

      {/* Profile Header Card */}
      <Card>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Profile Picture and Info */}
          <div className="flex items-center space-x-6 flex-1">
            <img
              src={profilePic}
              alt="Profile"
              className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover border-2 border-n-5"
              onError={(e) => {
                e.target.src = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQtoagYg1XvNp0KTskjA_F7TqVLEvkWqmPYqQ&s';
              }}
            />
            <div className="flex-1 min-w-0">
              <h1 className="h2 text-n-1 mb-2 break-words">{username}</h1>
              <p className="body-2 text-n-3 mb-3 break-words">{bio}</p>
              <div className="flex items-center space-x-2">
                <code className="caption bg-n-8 px-3 py-1.5 rounded-lg text-n-2 font-code truncate max-w-[200px] md:max-w-xs">
                  {principalId}
                </code>
                <button
                  onClick={() => copyToClipboard(principalId)}
                  className="p-2 text-color-1 hover:text-color-2 transition-colors"
                  title="Copy Principal ID"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <Button
              onClick={() => setIsEditing(true)}
              variant="secondary"
              className="flex-1 md:flex-none"
            >
              <Settings className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </div>
      </Card>

      {/* Wallet Balances Section */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <CardTitle>Wallet Balances</CardTitle>
          <button
            onClick={handleRefreshBalances}
            disabled={refreshing}
            className="p-2 text-color-1 hover:text-color-2 transition-colors disabled:opacity-50"
            title="Refresh Balances"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <BalanceCard
            symbol="ckBTC"
            balance={balances?.ckBTC?.balance || 0}
            isLoading={balancesLoading}
            error={balances?.ckBTC?.error}
          />
          <BalanceCard
            symbol="ckETH"
            balance={balances?.ckETH?.balance || 0}
            isLoading={balancesLoading}
            error={balances?.ckETH?.error}
          />
          <BalanceCard
            symbol="ckTESTBTC"
            balance={balances?.ckTESTBTC?.balance || 0}
            isLoading={balancesLoading}
            error={balances?.ckTESTBTC?.error}
          />
          <BalanceCard
            symbol="cksepoliaETH"
            balance={balances?.cksepoliaETH?.balance || 0}
            isLoading={balancesLoading}
            error={balances?.cksepoliaETH?.error}
          />
        </div>

        {balancesError && (
          <Alert type="error" className="mt-4">
            Failed to load some balances. Please try refreshing.
          </Alert>
        )}
      </Card>

      {/* Activity Section */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        
        <div className="text-center py-12">
          <div className="inline-block p-4 bg-n-6 rounded-2xl mb-4">
            <ExternalLink className="w-8 h-8 text-n-4" />
          </div>
          <p className="body-2 text-n-3 mb-2">No recent activity</p>
          <p className="caption text-n-4">Your transactions will appear here</p>
        </div>
      </Card>

      {/* Edit Profile Modal */}
      {isEditing && (
        <EditProfileModal
          currentUsername={username}
          currentBio={bio}
          currentProfilePic={profilePic}
          onClose={() => setIsEditing(false)}
          onSave={handleSaveProfile}
        />
      )}
    </div>
  );
};

export default Profile;