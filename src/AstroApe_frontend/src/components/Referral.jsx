import React, { useState, useEffect } from 'react';
import { 
  Copy, 
  Users, 
  Coins, 
  TrendingUp, 
  Gift,
  ExternalLink,
  CheckCircle,
  Clock,
  Share2,
  Award
} from 'lucide-react';
import { useReferralActor } from '../hooks/useReferralActor';
import { Button } from './booster/Button';
import { Input } from './booster/Input';
import { Alert } from './booster/Alert';
import { Card, CardHeader, CardTitle } from './referral/Card';
import { StatsCard } from './referral/StatsCard';

const Referral = () => {
  const { actor, loading: actorLoading, isAuthenticated } = useReferralActor();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [userStats, setUserStats] = useState(null);
  const [referralLink, setReferralLink] = useState('');
  const [pendingRewards, setPendingRewards] = useState(BigInt(0));
  const [referrals, setReferrals] = useState([]);
  const [claimedRewards, setClaimedRewards] = useState([]);
  const [signupCode, setSignupCode] = useState('');
  const [showClaimAnimation, setShowClaimAnimation] = useState(false);

  // Load user data
  useEffect(() => {
    if (actor && isAuthenticated) {
      loadUserData();
    }
  }, [actor, isAuthenticated]);

  const loadUserData = async () => {
    if (!actor) return;

    try {
      setLoading(true);

      // Get user stats
      const statsResult = await actor.getUserStats(await actor.getPrincipal());
      if ('ok' in statsResult) {
        setUserStats(statsResult.ok);
      }

      // Get referral link
      const linkResult = await actor.getReferralLink();
      if ('ok' in linkResult) {
        setReferralLink(linkResult.ok);
      }

      // Get pending rewards
      const pending = await actor.getPendingRewards(await actor.getPrincipal());
      setPendingRewards(pending);

      // Get referrals
      const refResult = await actor.getReferralsByUser(await actor.getPrincipal());
      if ('ok' in refResult) {
        setReferrals(refResult.ok);
      }

      // Get claimed rewards
      const claimed = await actor.getClaimedRewards(await actor.getPrincipal());
      setClaimedRewards(claimed);

    } catch (err) {
      console.error('Error loading user data:', err);
      setError('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    if (!actor) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const result = await actor.generateReferralCode();
      
      if ('ok' in result) {
        setSuccess('Referral code generated successfully!');
        await loadUserData();
      } else {
        setError(result.err);
      }
    } catch (err) {
      console.error('Error generating code:', err);
      setError('Failed to generate referral code');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpWithCode = async () => {
    if (!actor || !signupCode.trim()) {
      setError('Please enter a referral code');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const result = await actor.signUpWithReferral(signupCode.trim());
      
      if ('ok' in result) {
        setSuccess(result.ok);
        setSignupCode('');
        await loadUserData();
      } else {
        setError(result.err);
      }
    } catch (err) {
      console.error('Error signing up:', err);
      setError('Failed to sign up with referral code');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!actor) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      setShowClaimAnimation(true);

      const result = await actor.claimRewards();
      
      if ('ok' in result) {
        const amount = Number(result.ok);
        setSuccess(`Successfully claimed ${amount} tokens!`);
        await loadUserData();
      } else {
        setError(result.err);
      }
    } catch (err) {
      console.error('Error claiming rewards:', err);
      setError('Failed to claim rewards');
    } finally {
      setLoading(false);
      setTimeout(() => setShowClaimAnimation(false), 2000);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 3000);
  };

  if (actorLoading) {
    return (
      <div className="container mx-auto mt-10">
        <Card>
          <div className="text-center py-8">
            <div className="inline-block p-4 bg-n-6 rounded-2xl mb-4">
              <Users className="w-12 h-12 text-n-4 animate-pulse" />
            </div>
            <p className="body-2 text-n-3">Loading referral system...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto mt-10">
        <Card>
          <div className="text-center">
            <Users className="w-16 h-16 text-color-1 mx-auto mb-6" />
            <h2 className="h3 text-n-1 mb-4">AstroApe Referral Program</h2>
            <p className="body-2 text-n-3 mb-8">
              Connect your wallet to start earning rewards through referrals
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
    <div className="container mx-auto lg:pt-24 pt-20 pb-16 space-y-8">
      {/* Hero Banner */}
      <Card>
        <div className="bg-gradient-to-r from-color-1 to-color-2 rounded-2xl p-8 text-n-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="h2 mb-2">Earn 1% on Every Trade</h1>
              <p className="body-1">Share your referral link and earn passive income from your network</p>
            </div>
            <div className="flex items-center space-x-3">
              <Gift className="w-12 h-12" />
              <div>
                <p className="caption uppercase tracking-wider opacity-80">Total Earned</p>
                <p className="text-3xl font-bold font-code">
                  {userStats ? Number(userStats.totalRewardsEarned) : 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Alerts */}
      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatsCard
              title="Total Referrals"
              value={userStats ? Number(userStats.totalReferrals) : 0}
              icon={<Users className="w-5 h-5 text-color-1" />}
              colorClass="text-color-4"
            />
            <StatsCard
              title="Pending Rewards"
              value={Number(pendingRewards)}
              icon={<Coins className="w-5 h-5 text-color-2" />}
              colorClass="text-color-2"
              subtitle="tokens"
            />
            <StatsCard
              title="Claimed Rewards"
              value={claimedRewards.reduce((sum, r) => sum + Number(r.amount), 0)}
              icon={<Award className="w-5 h-5 text-color-1" />}
              colorClass="text-color-1"
              subtitle="tokens"
            />
          </div>

          {/* Referral Link Section */}
          <Card>
            <CardHeader>
              <CardTitle>Your Referral Link</CardTitle>
            </CardHeader>
            
            {referralLink ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Input
                    type="text"
                    value={referralLink}
                    readOnly
                    className="flex-1"
                  />
                  <button
                    onClick={() => copyToClipboard(referralLink)}
                    className="p-3 bg-n-6 hover:bg-n-5 rounded-xl transition-colors"
                  >
                    <Copy className="w-5 h-5 text-color-1" />
                  </button>
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ url: referralLink });
                      } else {
                        copyToClipboard(referralLink);
                      }
                    }}
                    className="p-3 bg-n-6 hover:bg-n-5 rounded-xl transition-colors"
                  >
                    <Share2 className="w-5 h-5 text-color-1" />
                  </button>
                </div>

                {userStats && (
                  <div className="flex items-center justify-between p-4 bg-n-8 rounded-xl">
                    <div>
                      <p className="caption text-n-3 uppercase tracking-wider mb-1">Your Code</p>
                      <p className="font-code text-lg text-n-1">{userStats.referralCode}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(userStats.referralCode)}
                      className="text-color-1 hover:text-color-2 transition-colors"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                )}

                <Button
                  onClick={handleClaimRewards}
                  disabled={loading || Number(pendingRewards) === 0}
                  className="w-full"
                >
                  {loading ? 'Claiming...' : `Claim ${Number(pendingRewards)} Tokens`}
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="body-2 text-n-3 mb-6">
                  Generate your unique referral code to start earning
                </p>
                <Button onClick={handleGenerateCode} disabled={loading}>
                  {loading ? 'Generating...' : 'Generate Referral Code'}
                </Button>
              </div>
            )}
          </Card>

          {/* Sign Up Section */}
          {!userStats && (
            <Card>
              <CardHeader>
                <CardTitle>Have a Referral Code?</CardTitle>
              </CardHeader>
              
              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="Enter referral code"
                  value={signupCode}
                  onChange={(e) => setSignupCode(e.target.value)}
                  label="Referral Code"
                />
                <Button
                  onClick={handleSignUpWithCode}
                  disabled={loading || !signupCode.trim()}
                  className="w-full"
                >
                  {loading ? 'Signing Up...' : 'Sign Up with Code'}
                </Button>
              </div>
            </Card>
          )}

          {/* Referrals List */}
          <Card>
            <CardHeader>
              <CardTitle>Your Referrals</CardTitle>
            </CardHeader>

            {referrals.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-block p-4 bg-n-6 rounded-2xl mb-4">
                  <TrendingUp className="w-8 h-8 text-n-4" />
                </div>
                <p className="body-2 text-n-3">No referrals yet</p>
                <p className="caption text-n-4 mt-2">Share your link to start earning</p>
              </div>
            ) : (
              <div className="space-y-3">
                {referrals.map((ref, index) => (
                  <div key={index} className="p-4 bg-n-7 rounded-xl border border-n-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-color-1/10 rounded-lg">
                          <Users className="w-4 h-4 text-color-1" />
                        </div>
                        <div>
                          <p className="font-code text-sm text-n-2 truncate max-w-[200px]">
                            {ref.referee.toText().slice(0, 10)}...
                          </p>
                          <p className="caption text-n-4">
                            {new Date(Number(ref.timestamp) / 1000000).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {ref.rewardClaimed ? (
                        <CheckCircle className="w-5 h-5 text-color-4" />
                      ) : (
                        <Clock className="w-5 h-5 text-color-2" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column - Rewards History */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Rewards History</CardTitle>
            </CardHeader>

            {claimedRewards.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-block p-4 bg-n-6 rounded-2xl mb-4">
                  <Award className="w-8 h-8 text-n-4" />
                </div>
                <p className="body-2 text-n-3">No rewards claimed yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {claimedRewards.map((reward, index) => (
                  <div key={index} className="p-4 bg-n-7 rounded-xl border border-n-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="caption text-n-3 uppercase tracking-wider">Claimed</span>
                      <span className="font-code text-lg text-color-1">
                        +{Number(reward.amount)}
                      </span>
                    </div>
                    <p className="caption text-n-4">
                      {new Date(Number(reward.claimedAt) / 1000000).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Claim Animation */}
      {showClaimAnimation && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
          <div className="bg-n-7 border border-color-1 rounded-2xl p-8 text-center">
            <div className="inline-block p-4 bg-color-1/20 rounded-2xl mb-4 animate-pulse">
              <Coins className="w-16 h-16 text-color-1" />
            </div>
            <h2 className="h4 text-n-1 mb-2">Claiming Rewards...</h2>
            <p className="body-2 text-n-3">Processing your request</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Referral;