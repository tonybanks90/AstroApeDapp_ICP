import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Iter "mo:base/Iter";
import Text "mo:base/Text";
import Option "mo:base/Option";



actor DEX {
    type LiquidityPool = {
        ckETH : Nat;
        xToken : Nat;
        totalShares : Nat;
    };

    let FEE : Nat = 3; // 0.3% fee
    let FEE_DENOMINATOR : Nat = 1000;
    
    var liquidityPools = HashMap.HashMap<Principal, LiquidityPool>(0, Principal.equal, Principal.hash);
    var userShares = HashMap.HashMap<Principal, HashMap.HashMap<Principal, Nat>>(0, Principal.equal, Principal.hash);

    let testPrincipal = Principal.fromText("aaaaa-aa");

    // Create new trading pair
    public shared func createPair(xToken : Principal, initialCkETH : Nat, initialXToken : Nat) : async Text {
        if (initialCkETH == 0 or initialXToken == 0) {
            return "Initial amounts must be greater than 0";
        };
        
        let pool : LiquidityPool = {
            ckETH = initialCkETH;
            xToken = initialXToken;
            totalShares = initialCkETH * initialXToken; // Initial liquidity shares = sqrt(a*b)
        };
        
        liquidityPools.put(xToken, pool);
        "Pair created successfully"
    };

    // Add liquidity to existing pair
    public shared(msg) func addLiquidity(xToken : Principal, ckETHAmount : Nat, xTokenAmount : Nat) : async Text {
        switch (liquidityPools.get(xToken)) {
            case (?pool) {
                let expectedXToken = (pool.xToken * ckETHAmount) / pool.ckETH;
                if (xTokenAmount < expectedXToken) {
                    return "Insufficient xToken amount";
                };
                
                let shares = (ckETHAmount * pool.totalShares) / pool.ckETH;
                let newPool : LiquidityPool = {
                    ckETH = pool.ckETH + ckETHAmount;
                    xToken = pool.xToken + xTokenAmount;
                    totalShares = pool.totalShares + shares;
                };
                
                liquidityPools.put(xToken, newPool);
                updateUserShares(msg.caller, xToken, shares);
                "Liquidity added successfully"
            };
            case null "Pair does not exist";
        }
    };

    // Remove liquidity from pool
    public shared(msg) func removeLiquidity(xToken : Principal, shares : Nat) : async Text {
        switch (liquidityPools.get(xToken), getUserShares(msg.caller, xToken)) {
            case (?pool, ?userShare) {
                if (userShare < shares) return "Insufficient shares";
                
                let ckETHAmount = (shares * pool.ckETH) / pool.totalShares;
                let xTokenAmount = (shares * pool.xToken) / pool.totalShares;
                
                let newPool : LiquidityPool = {
                    ckETH = pool.ckETH - ckETHAmount;
                    xToken = pool.xToken - xTokenAmount;
                    totalShares = pool.totalShares - shares;
                };
                
                liquidityPools.put(xToken, newPool);
                updateUserShares(msg.caller, xToken, 0); // Set to zero after removal
                "Liquidity removed successfully"
            };
            case (_, _) "Operation failed";
        }
    };

    // Swap ckETH to xToken
    public shared func swapCkETHToXToken(xToken : Principal, amountIn : Nat) : async Text {
        switch (liquidityPools.get(xToken)) {
            case (?pool) {
                let amountInWithFee = (amountIn * (FEE_DENOMINATOR - FEE)) / FEE_DENOMINATOR;
                let amountOut = (amountInWithFee * pool.xToken) / (pool.ckETH + amountInWithFee);
                
                if (amountOut >= pool.xToken) return "Insufficient liquidity";
                
                liquidityPools.put(xToken, {
                    ckETH = pool.ckETH + amountIn;
                    xToken = pool.xToken - amountOut;
                    totalShares = pool.totalShares;
                });
                "Swapped " # Nat.toText(amountIn) # " ckETH for " # Nat.toText(amountOut) # " xToken"
            };
            case null "Pair does not exist";
        }
    };

    // Swap xToken to ckETH
public shared func swapXTokenToCkETH(xToken : Principal, amountIn : Nat) : async Text {
    switch (liquidityPools.get(xToken)) {
        case (?pool) {
            let amountInWithFee = (amountIn * (FEE_DENOMINATOR - FEE)) / FEE_DENOMINATOR;
            if (pool.xToken + amountInWithFee == 0) return "Invalid swap calculation";
            let amountOut = (amountInWithFee * pool.ckETH) / (pool.xToken + amountInWithFee);
            
            if (amountOut >= pool.ckETH) return "Insufficient liquidity";

            liquidityPools.put(xToken, {
                ckETH = pool.ckETH - amountOut;
                xToken = pool.xToken + amountIn;
                totalShares = pool.totalShares;
            });

            "Swapped " # Nat.toText(amountIn) # " xToken for " # Nat.toText(amountOut) # " ckETH"
        };
        case null "Pair does not exist";
    }
};

    // Helper functions
    private func updateUserShares(user : Principal, xToken : Principal, shares : Nat) {
        let userPoolShares = switch (userShares.get(user)) {
            case (?sharesMap) sharesMap;
            case null HashMap.HashMap<Principal, Nat>(0, Principal.equal, Principal.hash);
        };
        
        let currentShares = Option.get(userPoolShares.get(xToken), 0);
        let newShares = currentShares + shares;
        
        userPoolShares.put(xToken, newShares);
        userShares.put(user, userPoolShares);
    };

    private func getUserShares(user : Principal, xToken : Principal) : ?Nat {
        switch (userShares.get(user)) {
            case (?sharesMap) sharesMap.get(xToken);
            case null null;
        }
    };

    // Query functions
    public query func getPool(xToken : Principal) : async ?LiquidityPool {
        liquidityPools.get(xToken)
    };

    public query func getUserSharesOf(user : Principal, xToken : Principal) : async ?Nat {
        switch (userShares.get(user)) {
            case (?sharesMap) sharesMap.get(xToken);
            case null null;
        }
    };
};