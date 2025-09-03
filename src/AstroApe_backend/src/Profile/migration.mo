import OrderedMap "mo:base/OrderedMap";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
module {
    type OldUserProfile = {
        name : Text;
        bio : Text;
    };

    type OldActor = {
        userProfiles : OrderedMap.Map<Principal, OldUserProfile>;
    };

    type NewUserProfile = {
        name : Text;
        bio : Text;
        profilePicturePath : ?Text;
    };

    type NewActor = {
        userProfiles : OrderedMap.Map<Principal, NewUserProfile>;
    };

    public func run(old : OldActor) : NewActor {
        let principalMap = OrderedMap.Make<Principal>(Principal.compare);
        let userProfiles = principalMap.map<OldUserProfile, NewUserProfile>(
            old.userProfiles,
            func(_principal, oldProfile) {
                { oldProfile with profilePicturePath = null };
            },
        );
        { userProfiles };
    };
};
