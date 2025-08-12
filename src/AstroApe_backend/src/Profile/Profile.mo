import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Blob "mo:base/Blob";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Debug "mo:base/Debug";


persistent actor Profile {

    public type UserProfile = {
        username: Text;
        bio: Text;
        profilePic: ?Blob;
    };

    // Stable variable for upgrade safety
    stable var stableProfiles: [(Principal, UserProfile)] = [];

    // In-memory transient profiles store
    private transient var profiles = HashMap.HashMap<Principal, UserProfile>(10, Principal.equal, Principal.hash);

    // --- WRITE / UPDATE FUNCTIONS ---

    public shared (msg) func createProfile(username: Text, bio: Text) : async () {
        let caller = msg.caller;

        if (profiles.get(caller) != null) {
            Debug.trap("Profile already exists for this principal. Use updateProfile() instead.");
        };

        let finalUsername = if (Text.size(username) == 0) "New User" else username;
        let finalBio = if (Text.size(bio) == 0) "No bio yet." else bio;

        profiles.put(
            caller,
            {
                username = finalUsername;
                bio = finalBio;
                profilePic = null;
            }
        );
    };

    public shared (msg) func updateProfile(newUsername: Text, newBio: Text) : async () {
        let caller = msg.caller;

        switch(profiles.get(caller)) {
            case (null) {
                Debug.trap("Profile does not exist. Please create one first.");
            };
            case (?oldProfile) {
                profiles.put(
                    caller,
                    {
                        profilePic = oldProfile.profilePic;
                        username = newUsername;
                        bio = newBio;
                    }
                );
            };
        };
    };

    public shared (msg) func updateProfilePic(image: Blob) : async () {
        let caller = msg.caller;

        switch(profiles.get(caller)) {
            case (null) {
                Debug.trap("Profile does not exist. Please create one first.");
            };
            case (?oldProfile) {
                profiles.put(
                    caller,
                    {
                        username = oldProfile.username;
                        bio = oldProfile.bio;
                        profilePic = ?image;
                    }
                );
            };
        };
    };

    // --- QUERY / READ-ONLY FUNCTIONS ---

    public query (msg) func whoami() : async Principal {
        return msg.caller;
    };

    public query (msg) func getMyProfile() : async ?UserProfile {
        return profiles.get(msg.caller);
    };

    public query func getUserProfile(user: Principal) : async ?UserProfile {
        return profiles.get(user);
    };

    public query func getUserCount() : async Nat {
        return profiles.size();
    };

    public query func getAllProfiles() : async [(Principal, UserProfile)] {
        return Iter.toArray(profiles.entries());
    };

    // --- SYSTEM FUNCTIONS FOR UPGRADES ---

    system func preupgrade() {
        stableProfiles := Iter.toArray(profiles.entries());
    };

    system func postupgrade() {
        profiles := HashMap.fromIter(Iter.fromArray(stableProfiles), 10, Principal.equal, Principal.hash);
    };
}
