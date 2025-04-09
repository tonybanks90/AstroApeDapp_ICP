import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import _ "mo:base/List";
import Iter "mo:base/Iter";
import _ "mo:base/Array";
import Nat "mo:base/Nat";

actor Profile {
  type UserProfile = {
    username: Text;
    bio: Text;
    profilePic: Text;
  };

  // Store profiles by Principal (user)
  var profiles = HashMap.HashMap<Principal, UserProfile>(10, Principal.equal, Principal.hash);

  // Counter to keep track of the number of users
  var userCount: Nat = 0;

  // For upgrade compatibility
  stable var stableProfiles: [(Principal, UserProfile)] = [];
  stable var stableUserCount: Nat = 0;

  // Create a new user profile, principal is passed as a parameter
  public shared func createUserProfile(caller: Principal, username: Text, profilePic: Text, bio: Text): async () {
    let newUserProfile: UserProfile = {
      username = username;
      bio = bio;
      profilePic = profilePic;
    };
    profiles.put(caller, newUserProfile);
    userCount := userCount + 1;
  };

  // Get the profile of the current user, principal is passed as a parameter
  public query func getMyProfile(caller: Principal): async ?UserProfile {
    return profiles.get(caller);
  };

  // Get the profile of any user by Principal
  public query func getUserProfile(userPrincipal: Principal): async ?UserProfile {
    return profiles.get(userPrincipal);
  };

  // Get the total number of profiles (users)
  public query func getUserCount(): async Nat {
    return userCount;
  };

  // Pre-upgrade function to save the state of profiles and counters
  system func preupgrade() {
    stableProfiles := Iter.toArray(profiles.entries());
    stableUserCount := userCount;
  };

  // Post-upgrade function to restore the state after upgrade
  system func postupgrade() {
    profiles := HashMap.HashMap<Principal, UserProfile>(10, Principal.equal, Principal.hash);
    for ((principal, profile) in stableProfiles.vals()) {
      profiles.put(principal, profile);
    };
    userCount := stableUserCount;
  };
};
