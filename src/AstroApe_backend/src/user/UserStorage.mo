import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Iter "mo:base/Iter";

actor UserStorage {
    // ✅ Stable storage for persistence
    stable var userList: [(Principal, Text)] = [];

    // ✅ In-memory HashMap for fast lookups
    var users = HashMap.HashMap<Principal, Text>(10, Principal.equal, Principal.hash);

    // ✅ Preserve user data before an upgrade
    system func preupgrade() {
        userList := Iter.toArray(users.entries());
    };

    // ✅ Restore user data after an upgrade
    system func postupgrade() {
        users := HashMap.HashMap<Principal, Text>(10, Principal.equal, Principal.hash);
        for ((principal, username) in Iter.fromArray(userList)) {
            users.put(principal, username);
        };
    };

    // ✅ Add user and update storage immediately
public shared ({ caller }) func addUser(username: Text) : async Text {
    if (Text.size(username) == 0) {
        return "❌ Username cannot be empty!";
    };

    switch (users.get(caller)) {
        case (?existingUser) {
            return "⚠️ User already exists: " # existingUser;
        };
        case null {
            users.put(caller, username);
            userList := Iter.toArray(users.entries()); // 🔹 Update stable storage immediately
            return "✅ User saved: " # username;
        };
    };
};

    // ✅ Fetch username by Principal (returns empty string if not found)
    public query func getUser(principal: Principal) : async Text {
        switch (users.get(principal)) {
            case (?username) { username }; // ✅ Return stored username
            case null { "" }; // ✅ Default empty response for frontend handling
        };
    };

    // ✅ Return all users
    public query func listUsers() : async [(Principal, Text)] {
        return Iter.toArray(users.entries());
    };
};
