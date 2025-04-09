import Principal "mo:base/Principal";
import List "mo:base/List";
import Debug "mo:base/Debug";
import Time "mo:base/Time";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Text "mo:base/Text";

actor CommentsBackend {

  type Comment = {
    id: Nat;
    text: Text;
    author: Principal;
    timestamp: Nat;
  };

  var groups = HashMap.HashMap<Text, List.List<Comment>>(10, Text.equal, Text.hash);
  var groupCounters = HashMap.HashMap<Text, Nat>(10, Text.equal, Text.hash); // ✅ commentCounter per group

  // For upgrade compatibility
  stable var stableGroups: [(Text, [Comment])] = [];
  stable var stableGroupCounters: [(Text, Nat)] = [];

  public shared (msg) func postComment(groupId: Text, text: Text): async () {
    if (text == "") {
      Debug.trap("Comment cannot be empty");
    };

    let timestampInt: Int = Time.now() / 1_000_000_000;
    let timestampNat: Nat = Int.abs(timestampInt);

    let currentCounter = switch (groupCounters.get(groupId)) {
      case (null) 0;
      case (?n) n;
    };

    let newComment: Comment = {
      id = currentCounter;
      text = text;
      author = msg.caller;
      timestamp = timestampNat;
    };

    groupCounters.put(groupId, currentCounter + 1);

    let currentList = switch (groups.get(groupId)) {
      case (null) List.nil<Comment>();
      case (?list) list;
    };

    groups.put(groupId, List.push(newComment, currentList));
  };

  public query func getComments(groupId: Text): async [(Nat, Text, Principal, Nat)] {
    switch (groups.get(groupId)) {
      case (null) return [];
      case (?list) {
        let reversed = List.reverse(list);
        return List.toArray(
          List.map<Comment, (Nat, Text, Principal, Nat)>(
            reversed,
            func (c) = (c.id, c.text, c.author, c.timestamp)
          )
        );
      };
    };
  };

  public query func getGroups(): async [Text] {
    let entries = Iter.toArray(groups.entries());
    return Array.map<(Text, List.List<Comment>), Text>(
      entries,
      func((k, _)) = k
    );
  };

  public query func getCommentCount(groupId: Text): async Nat {
    switch (groupCounters.get(groupId)) {
      case (null) 0;
      case (?n) n;
    }
  };

  system func preupgrade() {
    stableGroups := Array.map<(Text, List.List<Comment>), (Text, [Comment])>(
      Iter.toArray(groups.entries()),
      func((k, v)) = (k, List.toArray(v))
    );

    stableGroupCounters := Iter.toArray(groupCounters.entries());
  };

  system func postupgrade() {
    groups := HashMap.HashMap<Text, List.List<Comment>>(10, Text.equal, Text.hash);
    for ((k, v) in stableGroups.vals()) {
      groups.put(k, List.fromArray(v));
    };

    groupCounters := HashMap.HashMap<Text, Nat>(10, Text.equal, Text.hash);
    for ((k, v) in stableGroupCounters.vals()) {
      groupCounters.put(k, v);
    };
  };
};
