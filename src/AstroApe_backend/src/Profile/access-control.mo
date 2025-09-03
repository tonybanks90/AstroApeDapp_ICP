import OrderedMap "mo:base/OrderedMap";
import Principal "mo:base/Principal";
import Debug "mo:base/Debug";

module {
    public type UserRole = {
        #admin;
        #user;
        #guest;
    };

    public type AccessControlState = {
        var adminAssigned : Bool;
        var userRoles : OrderedMap.Map<Principal, UserRole>;
    };

    public func initState() : AccessControlState {
        let principalMap = OrderedMap.Make<Principal>(Principal.compare);
        {
            var adminAssigned = false;
            var userRoles = principalMap.empty<UserRole>();
        };
    };

    // First principal that calls this function becomes admin, all other principals become users.
    public func initialize(state : AccessControlState, caller : Principal) {
        if (not Principal.isAnonymous(caller)) {
            let principalMap = OrderedMap.Make<Principal>(Principal.compare);
            switch (principalMap.get(state.userRoles, caller)) {
                case (?_) {};
                case (null) {
                    if (not state.adminAssigned) {
                        state.userRoles := principalMap.put(state.userRoles, caller, #admin);
                        state.adminAssigned := true;
                    } else {
                        state.userRoles := principalMap.put(state.userRoles, caller, #user);
                    };
                };
            };
        };
    };

    public func getUserRole(state : AccessControlState, caller : Principal) : UserRole {
        if (Principal.isAnonymous(caller)) {
            #guest;
        } else {
            let principalMap = OrderedMap.Make<Principal>(Principal.compare);
            switch (principalMap.get(state.userRoles, caller)) {
                case (?role) { role };
                case (null) {
                    Debug.trap("User is not registered");
                };
            };
        };
    };

    public func assignRole(state : AccessControlState, caller : Principal, user : Principal, role : UserRole) {
        if (not (isAdmin(state, caller))) {
            Debug.trap("Unauthorized: Only admins can assign user roles");
        };
        let principalMap = OrderedMap.Make<Principal>(Principal.compare);
        state.userRoles := principalMap.put(state.userRoles, user, role);
    };

    public func hasPermission(state : AccessControlState, caller : Principal, requiredRole : UserRole) : Bool {
        let role = getUserRole(state, caller);
        switch (role) {
            case (#admin) true;
            case (role) {
                switch (requiredRole) {
                    case (#admin) false;
                    case (#user) role == #user;
                    case (#guest) true;
                };
            };
        };
    };

    public func isAdmin(state : AccessControlState, caller : Principal) : Bool {
        getUserRole(state, caller) == #admin;
    };
};
