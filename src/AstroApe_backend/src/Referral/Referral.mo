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

actor AstroApe {
    // Types
    type ReferralCode = Text;
    type UserId = Principal; // Using Principal as user ID from SIWE
    type ReferralInfo = {
        referrer: UserId; // The user who referred
        referee: UserId; // The user who signed up using the referral
        timestamp: Time.Time;
    };

    // Storage
    private stable var referralCodes = HashMap.HashMap<UserId, ReferralCode>(0, Principal.equal, Principal.hash);
    private stable var referrals = HashMap.HashMap<ReferralCode, [ReferralInfo]>(0, Text.equal, Text.hash);
    private stable var userReferralCount = HashMap.HashMap<UserId, Nat>(0, Principal.equal, Principal.hash);

    // Generate a unique referral code for a user
    public shared(msg) func generateReferralCode(): async Result.Result<ReferralCode, Text> {
        let userId = msg.caller; // Get the Principal ID of the caller
        switch (referralCodes.get(userId)) {
            case (?existingCode) {
                #ok(existingCode) // Return existing code if already generated
            };
            case null {
                let code = await _generateUniqueCode(userId);
                referralCodes.put(userId, code);
                #ok(code)
            };
        }
    };

    // Internal function to generate a unique referral code
    private func _generateUniqueCode(userId: UserId): async ReferralCode {
        // Simple hash-based code using Principal and timestamp
        let timestamp = Time.now();
        let principalText = Principal.toText(userId);
        let combined = principalText # Nat.toText(timestamp);
        let hash = Hash.hash(Text.hash(combined));
        "ASTRO-" # Nat.toText(hash % 1000000) // 6-digit code for simplicity
    };

    // Function to handle sign-up with a referral code
    public shared(msg) func signUpWithReferral(referralCode: ReferralCode): async Result.Result<Text, Text> {
        let refereeId = msg.caller; // Principal ID of the new user
        // Check if user already has a referral code (i.e., already signed up)
        switch (referralCodes.get(refereeId)) {
            case (?_) {
                return #err("User already registered");
            };
            case null {
                // Verify referral code exists
                switch (referrals.get(referralCode)) {
                    case null {
                        return #err("Invalid referral code");
                    };
                    case (?existingReferrals) {
                        // Find the referrer by their referral code
                        let referrerOpt = Iter.toArray(referralCodes.entries())
                            |> Array.find<(UserId, ReferralCode)>(func((_, code)) { code == referralCode });
                        let referrer = switch (referrerOpt) {
                            case (? (principal, _)) { principal };
                            case null { Principal.fromText("aaaaa-aa") }; // Default to anonymous principal
                        };

                        // Record the referral
                        let referralInfo: ReferralInfo = {
                            referrer = referrer;
                            referee = refereeId;
                            timestamp = Time.now();
                        };
                        let updatedReferrals = switch (referrals.get(referralCode)) {
                            case (?refs) {
                                let buffer = Buffer.fromArray<ReferralInfo>(refs);
                                buffer.add(referralInfo);
                                Buffer.toArray(buffer);
                            };
                            case null {
                                [referralInfo];
                            };
                        };
                        referrals.put(referralCode, updatedReferrals);

                        // Update referral count for the referrer
                        let currentCount = Option.get(userReferralCount.get(referrer), 0);
                        userReferralCount.put(referrer, currentCount + 1);

                        // Generate a referral code for the new user
                        let newUserCode = await _generateUniqueCode(refereeId);
                        referralCodes.put(refereeId, newUserCode);

                        #ok("Sign-up successful. Your referral code: " # newUserCode)
                    };
                }
            };
        }
    };

    // Query referral code for a user
    public query func getReferralCode(userId: UserId): async Result.Result<ReferralCode, Text> {
        switch (referralCodes.get(userId)) {
            case (?code) { #ok(code) };
            case null { #err("No referral code found for user") };
        }
    };

    // Query referrals made by a user (using their referral code)
    public query func getReferralsByUser(userId: UserId): async Result.Result<[ReferralInfo], Text> {
        switch (referralCodes.get(userId)) {
            case (?code) {
                switch (referrals.get(code)) {
                    case (?referralList) { #ok(referralList) };
                    case null { #ok([]) }; // No referrals yet
                }
            };
            case null { #err("User has no referral code") };
        }
    };

    // Query the number of referrals for a user
    public query func getReferralCount(userId: UserId): async Nat {
        Option.get(userReferralCount.get(userId), 0)
    };

    // Generate referral link
    public shared(msg) func getReferralLink(): async Result.Result<Text, Text> {
        let userId = msg.caller;
        switch (await getReferralCode(userId)) {
            case (#ok(code)) {
                let link = "https://astroape.app/signup?ref=" # code;
                #ok(link)
            };
            case (#err(msg)) { #err(msg) };
        }
    };
};