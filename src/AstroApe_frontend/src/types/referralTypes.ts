import { Principal } from '@dfinity/principal';

export interface ReferralInfo {
  referrer: Principal;
  referee: Principal;
  timestamp: bigint;
  rewardClaimed: boolean;
}

export interface RewardInfo {
  userId: Principal;
  rewardType: { Tokens: bigint } | { Points: bigint } | { NFT: string };
  amount: bigint;
  claimedAt: bigint;
  referralCode: string;
}

export interface UserStats {
  totalReferrals: bigint;
  successfulReferrals: bigint;
  totalRewardsEarned: bigint;
  referralCode: string;
  signupDate: bigint;
}

export interface ReferralAnalytics {
  totalUsers: bigint;
  totalReferrals: bigint;
  conversionRate: number;
  totalRewardsDistributed: bigint;
  topReferrers: [Principal, bigint][];
}

export interface SystemStats {
  totalUsers: bigint;
  totalReferrals: bigint;
  totalPendingRewards: bigint;
  totalClaimedRewards: bigint;
}

export type Result<T, E = string> = { ok: T } | { err: E };