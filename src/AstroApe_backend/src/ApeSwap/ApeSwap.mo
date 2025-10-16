import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Iter "mo:base/Iter";
import Text "mo:base/Text";
import Option "mo:base/Option";
import Array "mo:base/Array";
import Result "mo:base/Result";
import Nat64 "mo:base/Nat64";

actor MultiBaseDEX {
    // Types
    type TokenId = Principal;
    type PoolId = Text; // Format: "BASE_TOKEN-TOKEN" e.g., "ckETH-ICP"
    
    type BaseToken = {
        #ckETH;
        #ckBTC;
        #ckSOL;
    };

    type Token = {
        principal : Principal;
        symbol : Text;
        name : Text;
        decimals : Nat8;
        verified : Bool;
    };

    type LiquidityPool = {
        poolId : PoolId;
        baseToken : BaseToken;
        basePrincipal : Principal;
        token : Principal;
        baseReserve : Nat;
        tokenReserve : Nat;
        totalShares : Nat;
        lastUpdated : Nat64;
    };

    type UserLiquidity = {
        poolId : PoolId;
        shares : Nat;
        baseDeposited : Nat;
        tokenDeposited : Nat;
    };

    type SwapResult = {
        amountIn : Nat;
        amountOut : Nat;
        fee : Nat;
        priceImpact : Text;
    };

    // Constants
    private let FEE : Nat = 3; // 0.3% fee
    private let FEE_DENOMINATOR : Nat = 1000;
    
    // Base token principals (these should be set to actual canister IDs)
    private let ckETH_PRINCIPAL = Principal.fromText("ss2fx-dyaaa-aaaar-qacoq-cai");
    private let ckBTC_PRINCIPAL = Principal.fromText("mxzaz-hqaaa-aaaar-qaada-cai");
    private let ckSOL_PRINCIPAL = Principal.fromText("6vt6p-6qaaa-aaaas-aibfa-cai");

    // State variables
    private transient var tokens = HashMap.HashMap<Principal, Token>(10, Principal.equal, Principal.hash);
    private transient var liquidityPools = HashMap.HashMap<PoolId, LiquidityPool>(10, Text.equal, Text.hash);
    private transient var userLiquidity = HashMap.HashMap<Principal, HashMap.HashMap<PoolId, UserLiquidity>>(10, Principal.equal, Principal.hash);
    
    // Initialize base tokens
    private func initializeBaseTokens() {
        let ckETH : Token = {
            principal = ckETH_PRINCIPAL;
            symbol = "ckETH";
            name = "Chain Key Ethereum";
            decimals = 18;
            verified = true;
        };
        
        let ckBTC : Token = {
            principal = ckBTC_PRINCIPAL;
            symbol = "ckBTC";
            name = "Chain Key Bitcoin";
            decimals = 8;
            verified = true;
        };
        
        let ckSOL : Token = {
            principal = ckSOL_PRINCIPAL;
            symbol = "ckSOL";
            name = "Chain Key Solana";
            decimals = 9;
            verified = true;
        };
        
        tokens.put(ckETH_PRINCIPAL, ckETH);
        tokens.put(ckBTC_PRINCIPAL, ckBTC);
        tokens.put(ckSOL_PRINCIPAL, ckSOL);
    };

    // Helper to get base token principal
    private func getBasePrincipal(base : BaseToken) : Principal {
        switch (base) {
            case (#ckETH) ckETH_PRINCIPAL;
            case (#ckBTC) ckBTC_PRINCIPAL;
            case (#ckSOL) ckSOL_PRINCIPAL;
        }
    };

    // Helper to get base token symbol
    private func getBaseSymbol(base : BaseToken) : Text {
        switch (base) {
            case (#ckETH) "ckETH";
            case (#ckBTC) "ckBTC";
            case (#ckSOL) "ckSOL";
        }
    };

    // Generate pool ID
    private func generatePoolId(base : BaseToken, token : Principal) : PoolId {
        let baseSymbol = getBaseSymbol(base);
        let tokenText = Principal.toText(token);
        baseSymbol # "-" # tokenText
    };

    // 1. Add a new token to the DEX
    public shared(msg) func addToken(
        tokenPrincipal : Principal,
        symbol : Text,
        name : Text,
        decimals : Nat8
    ) : async Result.Result<Text, Text> {
        // Check if token already exists
        switch (tokens.get(tokenPrincipal)) {
            case (?_) {
                return #err("Token already exists");
            };
            case null {
                let newToken : Token = {
                    principal = tokenPrincipal;
                    symbol = symbol;
                    name = name;
                    decimals = decimals;
                    verified = false;
                };
                
                tokens.put(tokenPrincipal, newToken);
                #ok("Token " # symbol # " added successfully")
            };
        }
    };

    // 2. Create a liquidity pool for a token with a base pair
    public shared(msg) func createPool(
        baseToken : BaseToken,
        token : Principal,
        initialBaseAmount : Nat,
        initialTokenAmount : Nat
    ) : async Result.Result<Text, Text> {
        // Validate inputs
        if (initialBaseAmount == 0 or initialTokenAmount == 0) {
            return #err("Initial amounts must be greater than 0");
        };

        // Check if token exists
        switch (tokens.get(token)) {
            case null {
                return #err("Token not registered. Please add token first.");
            };
            case (?_) {};
        };

        let poolId = generatePoolId(baseToken, token);
        
        // Check if pool already exists
        switch (liquidityPools.get(poolId)) {
            case (?_) {
                return #err("Pool already exists");
            };
            case null {
                // Calculate initial shares using geometric mean
                let initialShares = Nat64.toNat(
                    Nat64.fromNat(initialBaseAmount) * Nat64.fromNat(initialTokenAmount)
                );
                
                let pool : LiquidityPool = {
                    poolId = poolId;
                    baseToken = baseToken;
                    basePrincipal = getBasePrincipal(baseToken);
                    token = token;
                    baseReserve = initialBaseAmount;
                    tokenReserve = initialTokenAmount;
                    totalShares = initialShares;
                    lastUpdated = 0; // Should be set to current timestamp
                };
                
                liquidityPools.put(poolId, pool);
                
                // Record user's liquidity
                let userLiq : UserLiquidity = {
                    poolId = poolId;
                    shares = initialShares;
                    baseDeposited = initialBaseAmount;
                    tokenDeposited = initialTokenAmount;
                };
                
                updateUserLiquidityRecord(msg.caller, poolId, userLiq);
                
                #ok("Pool created: " # poolId)
            };
        }
    };

    // 3. Add liquidity to an existing pool
    public shared(msg) func addLiquidity(
        baseToken : BaseToken,
        token : Principal,
        baseAmount : Nat,
        tokenAmount : Nat,
        minShares : Nat
    ) : async Result.Result<Text, Text> {
        let poolId = generatePoolId(baseToken, token);
        
        switch (liquidityPools.get(poolId)) {
            case null {
                #err("Pool does not exist")
            };
            case (?pool) {
                // Validate pool reserves
                if (pool.baseReserve == 0 or pool.tokenReserve == 0) {
                    return #err("Invalid pool state: reserves cannot be zero");
                };
                
                // Calculate required token amount based on current ratio
                let requiredTokenAmount = (pool.tokenReserve * baseAmount) / pool.baseReserve;
                
                if (tokenAmount < requiredTokenAmount) {
                    return #err("Insufficient token amount. Required: " # Nat.toText(requiredTokenAmount));
                };
                
                // Calculate shares to mint
                let shares = (baseAmount * pool.totalShares) / pool.baseReserve;
                
                if (shares < minShares) {
                    return #err("Slippage tolerance exceeded");
                };
                
                // Update pool
                let updatedPool : LiquidityPool = {
                    poolId = pool.poolId;
                    baseToken = pool.baseToken;
                    basePrincipal = pool.basePrincipal;
                    token = pool.token;
                    baseReserve = pool.baseReserve + baseAmount;
                    tokenReserve = pool.tokenReserve + requiredTokenAmount;
                    totalShares = pool.totalShares + shares;
                    lastUpdated = pool.lastUpdated;
                };
                
                liquidityPools.put(poolId, updatedPool);
                
                // Update user liquidity
                let currentUserLiq = getUserLiquidityRecord(msg.caller, poolId);
                let newUserLiq : UserLiquidity = switch (currentUserLiq) {
                    case (?existing) {
                        {
                            poolId = poolId;
                            shares = existing.shares + shares;
                            baseDeposited = existing.baseDeposited + baseAmount;
                            tokenDeposited = existing.tokenDeposited + requiredTokenAmount;
                        }
                    };
                    case null {
                        {
                            poolId = poolId;
                            shares = shares;
                            baseDeposited = baseAmount;
                            tokenDeposited = requiredTokenAmount;
                        }
                    };
                };
                
                updateUserLiquidityRecord(msg.caller, poolId, newUserLiq);
                
                #ok("Liquidity added. Shares: " # Nat.toText(shares))
            };
        }
    };

    // 4. Remove liquidity from pool
    public shared(msg) func removeLiquidity(
        baseToken : BaseToken,
        token : Principal,
        shares : Nat,
        minBaseAmount : Nat,
        minTokenAmount : Nat
    ) : async Result.Result<Text, Text> {
        let poolId = generatePoolId(baseToken, token);
        
        switch (liquidityPools.get(poolId), getUserLiquidityRecord(msg.caller, poolId)) {
            case (?pool, ?userLiq) {
                if (userLiq.shares < shares) {
                    return #err("Insufficient shares");
                };
                
                // Validate pool state
                if (pool.totalShares == 0) {
                    return #err("Invalid pool state: total shares cannot be zero");
                };
                
                // Calculate amounts to return
                let baseAmount = (shares * pool.baseReserve) / pool.totalShares;
                let tokenAmount = (shares * pool.tokenReserve) / pool.totalShares;
                
                if (baseAmount < minBaseAmount or tokenAmount < minTokenAmount) {
                    return #err("Slippage tolerance exceeded");
                };
                
                // Update pool
                let updatedPool : LiquidityPool = {
                    poolId = pool.poolId;
                    baseToken = pool.baseToken;
                    basePrincipal = pool.basePrincipal;
                    token = pool.token;
                    baseReserve = pool.baseReserve - baseAmount;
                    tokenReserve = pool.tokenReserve - tokenAmount;
                    totalShares = pool.totalShares - shares;
                    lastUpdated = pool.lastUpdated;
                };
                
                liquidityPools.put(poolId, updatedPool);
                
                // Update user liquidity
                let newShares = userLiq.shares - shares;
                if (newShares == 0) {
                    removeUserLiquidityRecord(msg.caller, poolId);
                } else {
                    // Validate user shares before division
                    if (userLiq.shares == 0) {
                        return #err("Invalid user liquidity state");
                    };
                    
                    let newUserLiq : UserLiquidity = {
                        poolId = userLiq.poolId;
                        shares = newShares;
                        baseDeposited = (userLiq.baseDeposited * newShares) / userLiq.shares;
                        tokenDeposited = (userLiq.tokenDeposited * newShares) / userLiq.shares;
                    };
                    updateUserLiquidityRecord(msg.caller, poolId, newUserLiq);
                };
                
                #ok("Removed " # Nat.toText(baseAmount) # " base and " # Nat.toText(tokenAmount) # " tokens")
            };
            case (_, _) {
                #err("Pool or user liquidity not found")
            };
        }
    };

    // 5. Swap base token for project token
    public shared(msg) func swapBaseToToken(
        baseToken : BaseToken,
        token : Principal,
        amountIn : Nat,
        minAmountOut : Nat
    ) : async Result.Result<SwapResult, Text> {
        let poolId = generatePoolId(baseToken, token);
        
        switch (liquidityPools.get(poolId)) {
            case null {
                #err("Pool does not exist")
            };
            case (?pool) {
                // Calculate fee
                let fee = (amountIn * FEE) / FEE_DENOMINATOR;
                let amountInAfterFee = amountIn - fee;
                
                // Calculate output amount using constant product formula
                // amountOut = (amountIn * tokenReserve) / (baseReserve + amountIn)
                let amountOut = (amountInAfterFee * pool.tokenReserve) / (pool.baseReserve + amountInAfterFee);
                
                if (amountOut >= pool.tokenReserve) {
                    return #err("Insufficient liquidity");
                };
                
                if (amountOut < minAmountOut) {
                    return #err("Slippage tolerance exceeded");
                };
                
                // Calculate price impact
                let priceImpact = if (pool.tokenReserve > 0) {
                    (amountOut * 10000) / pool.tokenReserve
                } else {
                    0
                };
                
                // Update pool
                let updatedPool : LiquidityPool = {
                    poolId = pool.poolId;
                    baseToken = pool.baseToken;
                    basePrincipal = pool.basePrincipal;
                    token = pool.token;
                    baseReserve = pool.baseReserve + amountIn;
                    tokenReserve = pool.tokenReserve - amountOut;
                    totalShares = pool.totalShares;
                    lastUpdated = pool.lastUpdated;
                };
                
                liquidityPools.put(poolId, updatedPool);
                
                let result : SwapResult = {
                    amountIn = amountIn;
                    amountOut = amountOut;
                    fee = fee;
                    priceImpact = Nat.toText(priceImpact / 100) # "." # Nat.toText(priceImpact % 100) # "%";
                };
                
                #ok(result)
            };
        }
    };

    // 6. Swap project token for base token
    public shared(msg) func swapTokenToBase(
        baseToken : BaseToken,
        token : Principal,
        amountIn : Nat,
        minAmountOut : Nat
    ) : async Result.Result<SwapResult, Text> {
        let poolId = generatePoolId(baseToken, token);
        
        switch (liquidityPools.get(poolId)) {
            case null {
                #err("Pool does not exist")
            };
            case (?pool) {
                // Calculate fee
                let fee = (amountIn * FEE) / FEE_DENOMINATOR;
                let amountInAfterFee = amountIn - fee;
                
                // Calculate output amount
                let amountOut = (amountInAfterFee * pool.baseReserve) / (pool.tokenReserve + amountInAfterFee);
                
                if (amountOut >= pool.baseReserve) {
                    return #err("Insufficient liquidity");
                };
                
                if (amountOut < minAmountOut) {
                    return #err("Slippage tolerance exceeded");
                };
                
                // Calculate price impact
                let priceImpact = if (pool.baseReserve > 0) {
                    (amountOut * 10000) / pool.baseReserve
                } else {
                    0
                };
                
                // Update pool
                let updatedPool : LiquidityPool = {
                    poolId = pool.poolId;
                    baseToken = pool.baseToken;
                    basePrincipal = pool.basePrincipal;
                    token = pool.token;
                    baseReserve = pool.baseReserve - amountOut;
                    tokenReserve = pool.tokenReserve + amountIn;
                    totalShares = pool.totalShares;
                    lastUpdated = pool.lastUpdated;
                };
                
                liquidityPools.put(poolId, updatedPool);
                
                let result : SwapResult = {
                    amountIn = amountIn;
                    amountOut = amountOut;
                    fee = fee;
                    priceImpact = Nat.toText(priceImpact / 100) # "." # Nat.toText(priceImpact % 100) # "%";
                };
                
                #ok(result)
            };
        }
    };

    // Helper functions for user liquidity management
    private func updateUserLiquidityRecord(user : Principal, poolId : PoolId, liquidity : UserLiquidity) {
        let userPools = switch (userLiquidity.get(user)) {
            case (?pools) pools;
            case null HashMap.HashMap<PoolId, UserLiquidity>(10, Text.equal, Text.hash);
        };
        
        userPools.put(poolId, liquidity);
        userLiquidity.put(user, userPools);
    };

    private func getUserLiquidityRecord(user : Principal, poolId : PoolId) : ?UserLiquidity {
        switch (userLiquidity.get(user)) {
            case (?pools) pools.get(poolId);
            case null null;
        }
    };

    private func removeUserLiquidityRecord(user : Principal, poolId : PoolId) {
        switch (userLiquidity.get(user)) {
            case (?pools) {
                pools.delete(poolId);
            };
            case null {};
        };
    };

    // Query functions
    public query func getToken(tokenPrincipal : Principal) : async ?Token {
        tokens.get(tokenPrincipal)
    };

    public query func getAllTokens() : async [Token] {
        Iter.toArray(Iter.map(tokens.vals(), func (t : Token) : Token { t }))
    };

    public query func getPool(baseToken : BaseToken, token : Principal) : async ?LiquidityPool {
        let poolId = generatePoolId(baseToken, token);
        liquidityPools.get(poolId)
    };

    public query func getAllPools() : async [LiquidityPool] {
        Iter.toArray(liquidityPools.vals())
    };

    public query func getUserLiquidity(user : Principal, baseToken : BaseToken, token : Principal) : async ?UserLiquidity {
        let poolId = generatePoolId(baseToken, token);
        getUserLiquidityRecord(user, poolId)
    };

    public query func getAllUserLiquidity(user : Principal) : async [UserLiquidity] {
        switch (userLiquidity.get(user)) {
            case (?pools) {
                Iter.toArray(pools.vals())
            };
            case null [];
        }
    };

    public query func getQuote(
        baseToken : BaseToken,
        token : Principal,
        amountIn : Nat,
        baseToToken : Bool
    ) : async Result.Result<Nat, Text> {
        let poolId = generatePoolId(baseToken, token);
        
        switch (liquidityPools.get(poolId)) {
            case null {
                #err("Pool does not exist")
            };
            case (?pool) {
                let fee = (amountIn * FEE) / FEE_DENOMINATOR;
                let amountInAfterFee = amountIn - fee;
                
                if (baseToToken) {
                    let amountOut = (amountInAfterFee * pool.tokenReserve) / (pool.baseReserve + amountInAfterFee);
                    #ok(amountOut)
                } else {
                    let amountOut = (amountInAfterFee * pool.baseReserve) / (pool.tokenReserve + amountInAfterFee);
                    #ok(amountOut)
                }
            };
        }
    };

    // Initialize on deployment
    initializeBaseTokens();
}