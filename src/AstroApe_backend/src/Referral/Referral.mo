import Principal "mo:base/Principal";
import Text "mo:base/Text";
import HashMap "mo:base/HashMap";
import Nat "mo:base/Nat";
import Buffer "mo:base/Buffer";
import Iter "mo:base/Iter";
import Hash "mo:base/Hash";
import Time "mo:base/Time";
import Result "mo:base/Result";
import Array "mo:base/Array";
import Option "mo:base/Option";
import Int "mo:base/Int";
import Nat32 "mo:base/Nat32";
import Float "mo:base/Float";


persistent actor AstroApeReferral {
    // Types
    type ReferralCode = Text;
    type UserId = Principal;
    
    type ReferralInfo = {
        referrer: UserId;
        referee: UserId;
        timestamp: Time.Time;
        rewardClaimed: Bool;
    };

    type RewardType = {
        #Tokens: Nat;
        #Points: Nat;
        #NFT: Text;
    };

    type RewardInfo = {
        userId: UserId;
        rewardType: RewardType;
        amount: Nat;
        claimedAt: Time.Time;
        referralCode: ReferralCode;
    };

    type UserStats = {
        totalReferrals: Nat;
        successfulReferrals: Nat;
        totalRewardsEarned: Nat;
        referralCode: Text;
        signupDate: Time.Time;
    };

    type ReferralAnalytics = {
        totalUsers: Nat;
        totalReferrals: Nat;
        conversionRate: Float;
        totalRewardsDistributed: Nat;
        topReferrers: [(UserId, Nat)];
    };

    // Constants
    private transient let REFERRAL_REWARD_AMOUNT: Nat = 100; // Tokens per referral
    private transient let REFEREE_BONUS_AMOUNT: Nat = 50; // Bonus for new user

    // Storage
    private transient var referralCodes = HashMap.HashMap<UserId, ReferralCode>(0, Principal.equal, Principal.hash);
    private transient var codeToUser = HashMap.HashMap<ReferralCode, UserId>(0, Text.equal, Text.hash);
    private transient var referrals = HashMap.HashMap<ReferralCode, Buffer.Buffer<ReferralInfo>>(0, Text.equal, Text.hash);
    private transient var userReferralCount = HashMap.HashMap<UserId, Nat>(0, Principal.equal, Principal.hash);
    private transient var claimedRewards = HashMap.HashMap<UserId, Buffer.Buffer<RewardInfo>>(0, Principal.equal, Principal.hash);
    private transient var userSignupTime = HashMap.HashMap<UserId, Time.Time>(0, Principal.equal, Principal.hash);
    private transient var pendingRewards = HashMap.HashMap<UserId, Nat>(0, Principal.equal, Principal.hash);
    
    // Stable storage for upgrades
    private stable var referralCodesEntries: [(UserId, ReferralCode)] = [];
    private stable var codeToUserEntries: [(ReferralCode, UserId)] = [];
    private stable var referralsEntries: [(ReferralCode, [ReferralInfo])] = [];
    private stable var userReferralCountEntries: [(UserId, Nat)] = [];
    private stable var claimedRewardsEntries: [(UserId, [RewardInfo])] = [];
    private stable var userSignupTimeEntries: [(UserId, Time.Time)] = [];
    private stable var pendingRewardsEntries: [(UserId, Nat)] = [];

    // System upgrade hooks
    system func preupgrade() {
        referralCodesEntries := Iter.toArray(referralCodes.entries());
        codeToUserEntries := Iter.toArray(codeToUser.entries());
        
        let referralsBuffer = Buffer.Buffer<(ReferralCode, [ReferralInfo])>(referrals.size());
        for ((code, refBuffer) in referrals.entries()) {
            referralsBuffer.add((code, Buffer.toArray(refBuffer)));
        };
        referralsEntries := Buffer.toArray(referralsBuffer);
        
        userReferralCountEntries := Iter.toArray(userReferralCount.entries());
        
        let claimedBuffer = Buffer.Buffer<(UserId, [RewardInfo])>(claimedRewards.size());
        for ((userId, rewardBuffer) in claimedRewards.entries()) {
            claimedBuffer.add((userId, Buffer.toArray(rewardBuffer)));
        };
        claimedRewardsEntries := Buffer.toArray(claimedBuffer);
        
        userSignupTimeEntries := Iter.toArray(userSignupTime.entries());
        pendingRewardsEntries := Iter.toArray(pendingRewards.entries());
    };

    system func postupgrade() {
        referralCodes := HashMap.fromIter<UserId, ReferralCode>(referralCodesEntries.vals(), referralCodesEntries.size(), Principal.equal, Principal.hash);
        codeToUser := HashMap.fromIter<ReferralCode, UserId>(codeToUserEntries.vals(), codeToUserEntries.size(), Text.equal, Text.hash);
        
        referrals := HashMap.HashMap<ReferralCode, Buffer.Buffer<ReferralInfo>>(0, Text.equal, Text.hash);
        for ((code, refArray) in referralsEntries.vals()) {
            referrals.put(code, Buffer.fromArray<ReferralInfo>(refArray));
        };
        
        userReferralCount := HashMap.fromIter<UserId, Nat>(userReferralCountEntries.vals(), userReferralCountEntries.size(), Principal.equal, Principal.hash);
        
        claimedRewards := HashMap.HashMap<UserId, Buffer.Buffer<RewardInfo>>(0, Principal.equal, Principal.hash);
        for ((userId, rewardArray) in claimedRewardsEntries.vals()) {
            claimedRewards.put(userId, Buffer.fromArray<RewardInfo>(rewardArray));
        };
        
        userSignupTime := HashMap.fromIter<UserId, Time.Time>(userSignupTimeEntries.vals(), userSignupTimeEntries.size(), Principal.equal, Principal.hash);
        pendingRewards := HashMap.fromIter<UserId, Nat>(pendingRewardsEntries.vals(), pendingRewardsEntries.size(), Principal.equal, Principal.hash);
        
        referralCodesEntries := [];
        codeToUserEntries := [];
        referralsEntries := [];
        userReferralCountEntries := [];
        claimedRewardsEntries := [];
        userSignupTimeEntries := [];
        pendingRewardsEntries := [];
    };

    // Generate a unique collision-resistant referral code
    public shared(msg) func generateReferralCode() : async Result.Result<ReferralCode, Text> {
        let userId = msg.caller;
        
        // Check if anonymous
        if (Principal.isAnonymous(userId)) {
            return #err("Anonymous users cannot generate referral codes");
        };

        switch (referralCodes.get(userId)) {
            case (?existingCode) {
                #ok(existingCode)
            };
            case null {
                let code = _generateUniqueCode(userId);
                referralCodes.put(userId, code);
                codeToUser.put(code, userId);
                
                // Initialize referral buffer for this code
                referrals.put(code, Buffer.Buffer<ReferralInfo>(0));
                
                // Record signup time
                userSignupTime.put(userId, Time.now());
                
                #ok(code)
            };
        }
    };

    // Internal function to generate unique referral code
    private func _generateUniqueCode(userId: UserId) : ReferralCode {
        let timestamp = Time.now();
        let principalText = Principal.toText(userId);
        let combined = principalText # Int.toText(timestamp);

        // Text.hash returns Nat32 — convert to Nat
        let hashNat: Nat = Nat32.toNat(Text.hash(combined));
        let code = "ASTRO" # Nat.toText(hashNat % 100000000);

        // Ensure uniqueness
        switch (codeToUser.get(code)) {
            case (?_) {
                let retryHash = Nat32.toNat(Text.hash(combined # "x"));
                "ASTRO" # Nat.toText(retryHash % 100000000);
            };
            case null { code };
        }
    };

    // Sign up with referral code
    public shared(msg) func signUpWithReferral(referralCode: ReferralCode) : async Result.Result<Text, Text> {
        let refereeId = msg.caller;
        
        if (Principal.isAnonymous(refereeId)) {
            return #err("Anonymous users cannot sign up");
        };

        // Check if user already registered
        switch (referralCodes.get(refereeId)) {
            case (?_) {
                return #err("User already registered");
            };
            case null {
                // Verify referral code exists
                switch (codeToUser.get(referralCode)) {
                    case null {
                        return #err("Invalid referral code");
                    };
                    case (?referrerId) {
                        // Prevent self-referral
                        if (Principal.equal(referrerId, refereeId)) {
                            return #err("Cannot use your own referral code");
                        };

                        // Create referral record
                        let referralInfo: ReferralInfo = {
                            referrer = referrerId;
                            referee = refereeId;
                            timestamp = Time.now();
                            rewardClaimed = false;
                        };

                        // Add to referrals
                        switch (referrals.get(referralCode)) {
                            case (?refBuffer) {
                                refBuffer.add(referralInfo);
                            };
                            case null {
                                let newBuffer = Buffer.Buffer<ReferralInfo>(1);
                                newBuffer.add(referralInfo);
                                referrals.put(referralCode, newBuffer);
                            };
                        };

                        // Update referral count
                        let currentCount = Option.get(userReferralCount.get(referrerId), 0);
                        userReferralCount.put(referrerId, currentCount + 1);

                        // Add pending rewards
                        let referrerCurrentReward = Option.get(pendingRewards.get(referrerId), 0);
                        pendingRewards.put(referrerId, referrerCurrentReward + REFERRAL_REWARD_AMOUNT);
                        
                        let refereeCurrentReward = Option.get(pendingRewards.get(refereeId), 0);
                        pendingRewards.put(refereeId, refereeCurrentReward + REFEREE_BONUS_AMOUNT);

                        // Generate code for new user
                        let newUserCode = _generateUniqueCode(refereeId);
                        referralCodes.put(refereeId, newUserCode);
                        codeToUser.put(newUserCode, refereeId);
                        referrals.put(newUserCode, Buffer.Buffer<ReferralInfo>(0));
                        userSignupTime.put(refereeId, Time.now());

                        #ok("Sign-up successful! Your referral code: " # newUserCode # ". You earned " # Nat.toText(REFEREE_BONUS_AMOUNT) # " bonus tokens!")
                    };
                }
            };
        }
    };

    // Claim pending rewards
    public shared(msg) func claimRewards() : async Result.Result<Nat, Text> {
        let userId = msg.caller;
        
        if (Principal.isAnonymous(userId)) {
            return #err("Anonymous users cannot claim rewards");
        };

        switch (pendingRewards.get(userId)) {
            case null {
                #err("No pending rewards to claim")
            };
            case (?amount) {
                if (amount == 0) {
                    return #err("No pending rewards to claim");
                };

                // Create reward record
                let rewardInfo: RewardInfo = {
                    userId = userId;
                    rewardType = #Tokens(amount);
                    amount = amount;
                    claimedAt = Time.now();
                    referralCode = Option.get(referralCodes.get(userId), "");
                };

                // Add to claimed rewards
                switch (claimedRewards.get(userId)) {
                    case (?rewardBuffer) {
                        rewardBuffer.add(rewardInfo);
                    };
                    case null {
                        let newBuffer = Buffer.Buffer<RewardInfo>(1);
                        newBuffer.add(rewardInfo);
                        claimedRewards.put(userId, newBuffer);
                    };
                };

                // Clear pending rewards
                pendingRewards.put(userId, 0);

                #ok(amount)
            };
        }
    };

    // Query: Get user's referral code
    public query func getReferralCode(userId: UserId) : async Result.Result<ReferralCode, Text> {
        switch (referralCodes.get(userId)) {
            case (?code) { #ok(code) };
            case null { #err("No referral code found for user") };
        }
    };

    // Query: Get referral link
    public shared(msg) func getReferralLink() : async Result.Result<Text, Text> {
        let userId = msg.caller;
        switch (referralCodes.get(userId)) {
            case (?code) {
                let link = "https://astroape.app/signup?ref=" # code;
                #ok(link)
            };
            case null {
                #err("No referral code found. Please generate one first.")
            };
        }
    };

    // Query: Get referrals made by user
    public query func getReferralsByUser(userId: UserId) : async Result.Result<[ReferralInfo], Text> {
        switch (referralCodes.get(userId)) {
            case (?code) {
                switch (referrals.get(code)) {
                    case (?refBuffer) { #ok(Buffer.toArray(refBuffer)) };
                    case null { #ok([]) };
                }
            };
            case null { #err("User has no referral code") };
        }
    };

    // Query: Get referral count
    public query func getReferralCount(userId: UserId) : async Nat {
        Option.get(userReferralCount.get(userId), 0)
    };

    // Query: Get pending rewards
    public query func getPendingRewards(userId: UserId) : async Nat {
        Option.get(pendingRewards.get(userId), 0)
    };

    // Query: Get claimed rewards history
    public query func getClaimedRewards(userId: UserId) : async [RewardInfo] {
        switch (claimedRewards.get(userId)) {
            case (?rewardBuffer) { Buffer.toArray(rewardBuffer) };
            case null { [] };
        }
    };

    // Query: Get total rewards earned (pending + claimed)
    public query func getTotalRewardsEarned(userId: UserId) : async Nat {
        let pending = Option.get(pendingRewards.get(userId), 0);
        let claimed = switch (claimedRewards.get(userId)) {
            case (?rewardBuffer) {
                var total = 0;
                for (reward in Buffer.toArray(rewardBuffer).vals()) {
                    total += reward.amount;
                };
                total
            };
            case null { 0 };
        };
        pending + claimed
    };

    // Query: Get user statistics
    public query func getUserStats(userId: UserId) : async Result.Result<UserStats, Text> {
        switch (referralCodes.get(userId)) {
            case null {
                #err("User not found")
            };
            case (?code) {
                let totalRefs = Option.get(userReferralCount.get(userId), 0);
                let totalRewards = switch (claimedRewards.get(userId)) {
                    case (?rewardBuffer) {
                        var total = 0;
                        for (reward in Buffer.toArray(rewardBuffer).vals()) {
                            total += reward.amount;
                        };
                        total
                    };
                    case null { 0 };
                };
                let pending = Option.get(pendingRewards.get(userId), 0);
                let signup = Option.get(userSignupTime.get(userId), Time.now());

                #ok({
                    totalReferrals = totalRefs;
                    successfulReferrals = totalRefs;
                    totalRewardsEarned = totalRewards + pending;
                    referralCode = code;
                    signupDate = signup;
                })
            };
        }
    };

    // Query: Get referral analytics (admin view)
    public query func getReferralAnalytics() : async ReferralAnalytics {
        let totalUsers = referralCodes.size();
        var totalRefs = 0;
        var totalRewardsDist = 0;

        // Calculate total referrals
        for ((_, refBuffer) in referrals.entries()) {
            totalRefs += refBuffer.size();
        };

        // Calculate total rewards distributed
        for ((_, rewardBuffer) in claimedRewards.entries()) {
            for (reward in Buffer.toArray(rewardBuffer).vals()) {
                totalRewardsDist += reward.amount;
            };
        };

        // Get top referrers
        let referrerArray = Iter.toArray(userReferralCount.entries());
        let sortedReferrers = Array.sort<(UserId, Nat)>(
            referrerArray,
            func(a, b) { 
                if (a.1 > b.1) { #less } 
                else if (a.1 < b.1) { #greater } 
                else { #equal }
            }
        );
        let topReferrers = if (sortedReferrers.size() > 10) {
            Array.tabulate<(UserId, Nat)>(10, func(i) { sortedReferrers[i] })
        } else {
            sortedReferrers
        };

        // Calculate conversion rate
        let conversionRate = if (totalUsers > 0) {
            Float.fromInt(totalRefs) / Float.fromInt(totalUsers)
        } else {
            0.0
        };

        {
            totalUsers = totalUsers;
            totalReferrals = totalRefs;
            conversionRate = conversionRate;
            totalRewardsDistributed = totalRewardsDist;
            topReferrers = topReferrers;
        }
    };

    // Query: Verify referral code exists
    public query func verifyReferralCode(code: ReferralCode) : async Bool {
        switch (codeToUser.get(code)) {
            case (?_) { true };
            case null { false };
        }
    };

    // Query: Get referrer from code
    public query func getReferrerFromCode(code: ReferralCode) : async Result.Result<UserId, Text> {
        switch (codeToUser.get(code)) {
            case (?userId) { #ok(userId) };
            case null { #err("Invalid referral code") };
        }
    };

    // Admin: Get all users (for debugging)
    public query func getAllUsers() : async [UserId] {
        Iter.toArray(referralCodes.keys())
    };

    // Admin: Get system stats
    public query func getSystemStats() : async {
        totalUsers: Nat;
        totalReferrals: Nat;
        totalPendingRewards: Nat;
        totalClaimedRewards: Nat;
    } {
        let totalUsers = referralCodes.size();
        var totalRefs = 0;
        var totalPending = 0;
        var totalClaimed = 0;

        for ((_, refBuffer) in referrals.entries()) {
            totalRefs += refBuffer.size();
        };

        for ((_, amount) in pendingRewards.entries()) {
            totalPending += amount;
        };

        for ((_, rewardBuffer) in claimedRewards.entries()) {
            for (reward in Buffer.toArray(rewardBuffer).vals()) {
                totalClaimed += reward.amount;
            };
        };

        {
            totalUsers = totalUsers;
            totalReferrals = totalRefs;
            totalPendingRewards = totalPending;
            totalClaimedRewards = totalClaimed;
        }
    };
}