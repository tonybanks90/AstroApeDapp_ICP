/**
 * MULTI-TOKEN BONDING CURVE CANISTER - COMPLETE IMPLEMENTATION
 * 
 * This canister implements a bonding curve mechanism that supports multiple tokens
 * with either ckBTC or ckETH as the base trading pair. It acts as the minter and
 * burner for all registered tokens.
 * 
 * KEY FEATURES:
 * - Multi-token support with independent configurations
 * - Dual base pair support (ckBTC and ckETH) - STRICT ENFORCEMENT
 * - Min and Max trade amounts per token
 * - Automatic minting on buy, burning on sell
 * - Slippage protection on all trades
 * - 80% supply threshold pause mechanism
 * - Isolated liquidity per token via vault subaccounts
 * - Comprehensive error handling with rollback mechanisms
 * 
 * BASE PAIR ENFORCEMENT:
 * - Each token registered with ONE base pair only
 * - ckBTC tokens ONLY tradable with ckBTC
 * - ckETH tokens ONLY tradable with ckETH
 * - Cross-pair trading is BLOCKED
 * 
 * TRADE LIMITS:
 * - min_trade_amount: Minimum base currency per trade
 * - max_trade_amount: Maximum base currency per trade
 * - Enforced on both buy and sell operations
 */

import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Buffer "mo:base/Buffer";
import Float "mo:base/Float";
import Hash "mo:base/Hash";
import Int "mo:base/Int";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Nat64 "mo:base/Nat64";
import Option "mo:base/Option";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Time "mo:base/Time";
import TrieMap "mo:base/TrieMap";

shared ({ caller = owner }) actor class MultiTokenBondingCurve(
  vault_canister_principal : Principal
) = this {

  // ========================================
  // TYPE DEFINITIONS
  // ========================================

  /**
   * BasePair: Represents the base currency for trading
   * - ckBTC: Bitcoin wrapper on ICP (8 decimals, satoshis)
   * - ckETH: Ethereum wrapper on ICP (18 decimals, wei)
   */
  public type BasePair = {
    #ckBTC;
    #ckETH;
  };

  /**
   * CurveType: Different pricing curve formulas
   * - linear: Constant rate of increase
   * - quadratic: Accelerating increase (rewards early buyers)
   * - exponential: Very rapid increase
   * - logarithmic: Fast start, then plateaus
   */
  public type CurveType = {
    #linear;
    #quadratic;
    #exponential;
    #logarithmic;
  };

  /**
   * TokenConfig: Immutable configuration for each registered token
   * 
   * IMPORTANT: base_pair is LOCKED at registration
   * Token can ONLY be traded with its registered base pair
   */
  public type TokenConfig = {
    token_id : Nat;
    token_canister : Principal;
    base_pair : BasePair;              // LOCKED - determines which currency can be used
    vault_subaccount : [Nat8];
    curve_type : CurveType;
    initial_price : Nat;
    price_at_graduation : Nat;
    fee_percent : Nat;
    min_trade_amount : Nat;            // Minimum base currency per trade
    max_trade_amount : Nat;            // Maximum base currency per trade
    max_supply : Nat;
    graduation_threshold : Nat;
    created_at : Int;
    creator : Principal;
  };

  /**
   * TokenState: Mutable state tracking for each token
   */
  public type TokenState = {
    tokens_minted : Nat;
    total_base_raised : Nat;
    protocol_fees_collected : Nat;
    is_graduated : Bool;
    trade_count : Nat;
    last_trade_price : Float;
  };

  /**
   * TradeInfo: Record of a trade transaction
   */
  public type TradeInfo = {
    token_id : Nat;
    user : Principal;
    trade_type : { #buy; #sell };
    base_amount : Nat;
    token_amount : Nat;
    price : Float;
    fee : Nat;
    timestamp : Int;
  };

  /**
   * BuyQuote: Preview of a buy transaction
   */
  public type BuyQuote = {
    tokens_out : Nat;
    current_price : Float;
    average_price : Float;
    price_after : Float;
    fee : Nat;
    price_impact : Float;
    slippage : Float;
  };

  /**
   * SellQuote: Preview of a sell transaction
   */
  public type SellQuote = {
    base_out : Nat;
    current_price : Float;
    average_price : Float;
    price_after : Float;
    fee : Nat;
    price_impact : Float;
    slippage : Float;
  };

  // ICRC-1 Account Type
  public type Account = {
    owner : Principal;
    subaccount : ?[Nat8];
  };

  // ICRC-1 Transfer Arguments
  public type TransferArgs = {
    from_subaccount : ?[Nat8];
    to : Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?[Nat8];
    created_at_time : ?Nat64;
  };

  // ICRC-2 Transfer From Arguments
  public type TransferFromArgs = {
    spender_subaccount : ?[Nat8];
    from : Account;
    to : Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?[Nat8];
    created_at_time : ?Nat64;
  };

  public type TransferResult = {
    #Ok : Nat;
    #Err : TransferError;
  };

  public type TransferError = {
    #BadFee : { expected_fee : Nat };
    #BadBurn : { min_burn_amount : Nat };
    #InsufficientFunds : { balance : Nat };
    #TooOld;
    #CreatedInFuture : { ledger_time : Nat64 };
    #TemporarilyUnavailable;
    #Duplicate : { duplicate_of : Nat };
    #GenericError : { error_code : Nat; message : Text };
  };

  // Token Ledger Interface (ICRC-1 + ICRC-2)
  public type TokenLedger = actor {
    icrc1_transfer : (TransferArgs) -> async (TransferResult);
    icrc2_transfer_from : (TransferFromArgs) -> async (TransferResult);
    icrc1_balance_of : (Account) -> async (Nat);
  };

  // Vault Interface
  public type VaultInterface = actor {
    registerToken : (Nat, BasePair) -> async (Result.Result<[Nat8], Text>);
    pullFunds : (Nat, BasePair, Principal, Nat) -> async (Result.Result<Nat, Text>);
    payFunds : (Nat, BasePair, Principal, Nat) -> async (Result.Result<Nat, Text>);
    getBalanceAsync : (Nat, BasePair) -> async (Result.Result<Nat, Text>);
  };

  // ========================================
  // CONSTANTS
  // ========================================

  // Supply limits based on base pair
  private transient let BITCOIN_MAX_SUPPLY : Nat = 21_000_000;
  private transient let ETHEREUM_MAX_SUPPLY : Nat = 1_000_000_000;

  // Decimal places
  private transient let SATOSHI_DECIMALS : Nat8 = 8;
  private transient let WEI_DECIMALS : Nat8 = 18;
  
  // Graduation threshold (80% of max supply)
  private transient let GRADUATION_PERCENT : Nat = 80;

  // Fee denominator (10000 = 100%)
  private transient let FEE_DENOMINATOR : Nat = 10000;

  // ========================================
  // STATE VARIABLES
  // ========================================

  private stable let vault_canister : Principal = vault_canister_principal;
  private stable var next_token_id : Nat = 1;

  // Storage: Token ID → Configuration
  private var token_configs = TrieMap.TrieMap<Nat, TokenConfig>(Nat.equal, Hash.hash);

  // Storage: Token ID → Current State
  private var token_states = TrieMap.TrieMap<Nat, TokenState>(Nat.equal, Hash.hash);

  // Storage: Token Canister Principal → Token ID
  private var canister_to_token_id = TrieMap.TrieMap<Principal, Nat>(
    Principal.equal,
    Principal.hash
  );

  // Trade history (last 1000 trades per token)
  private var trade_history = TrieMap.TrieMap<Nat, [TradeInfo]>(Nat.equal, Hash.hash);

  // Stable storage for upgrades
  private stable var stable_token_configs : [(Nat, TokenConfig)] = [];
  private stable var stable_token_states : [(Nat, TokenState)] = [];
  private stable var stable_canister_to_token_id : [(Principal, Nat)] = [];
  private stable var stable_next_token_id : Nat = 1;

  // ========================================
  // UTILITY FUNCTIONS
  // ========================================

  private func safeIntToNat(i : Int) : Nat {
    if (i >= 0) {
      Int.abs(i);
    } else {
      0;
    }
  };

  private func toFloat(n : Nat) : Float {
    Float.fromInt(n);
  };

  private func fromFloat(f : Float) : Nat {
    let rounded = Float.toInt(Float.nearest(f));
    safeIntToNat(rounded);
  };

  /**
   * Get maximum supply based on base pair
   */
  private func getMaxSupply(base_pair : BasePair) : Nat {
    switch (base_pair) {
      case (#ckBTC) {
        BITCOIN_MAX_SUPPLY * (10 ** Nat8.toNat(SATOSHI_DECIMALS));
      };
      case (#ckETH) {
        ETHEREUM_MAX_SUPPLY * (10 ** Nat8.toNat(WEI_DECIMALS));
      };
    }
  };

  /**
   * Get decimal places for base pair
   */
  private func getBaseDecimals(base_pair : BasePair) : Nat8 {
    switch (base_pair) {
      case (#ckBTC) SATOSHI_DECIMALS;
      case (#ckETH) WEI_DECIMALS;
    }
  };

  /**
   * Calculate graduation threshold (80% of max supply)
   */
  private func calculateGraduationThreshold(max_supply : Nat) : Nat {
    (max_supply * GRADUATION_PERCENT) / 100;
  };

  /**
   * Get base pair name as text
   */
  private func basePairToText(base_pair : BasePair) : Text {
    switch (base_pair) {
      case (#ckBTC) "ckBTC";
      case (#ckETH) "ckETH";
    }
  };

  /**
   * Record a trade in history (keep last 1000 per token)
   */
  private func recordTrade(trade : TradeInfo) {
    let history = Option.get(trade_history.get(trade.token_id), []);
    let updated = if (history.size() >= 1000) {
      let buffer = Buffer.Buffer<TradeInfo>(1000);
      for (i in Iter.range(1, history.size() - 1)) {
        buffer.add(history[i]);
      };
      buffer.add(trade);
      Buffer.toArray(buffer);
    } else {
      Array.append(history, [trade]);
    };
    trade_history.put(trade.token_id, updated);
  };

  // ========================================
  // BONDING CURVE MATH
  // ========================================

  /**
   * Calculate current price for a token based on its bonding curve
   */
  private func calculatePrice(token_id : Nat) : Result.Result<Float, Text> {
    let config = switch (token_configs.get(token_id)) {
      case (null) return #err("Token not registered");
      case (?c) c;
    };

    let state = switch (token_states.get(token_id)) {
      case (null) return #err("Token state not found");
      case (?s) s;
    };

    if (state.is_graduated) {
      return #ok(toFloat(config.price_at_graduation));
    };

    let current = toFloat(state.tokens_minted);
    let threshold = toFloat(config.graduation_threshold);
    
    if (threshold == 0.0) {
      return #ok(toFloat(config.initial_price));
    };

    let t = current / threshold;
    let p0 = toFloat(config.initial_price);
    let p1 = toFloat(config.price_at_graduation);

    let price = switch (config.curve_type) {
      case (#linear) {
        p0 + (p1 - p0) * t;
      };
      case (#quadratic) {
        p0 + (p1 - p0) * t * t;
      };
      case (#exponential) {
        let exp_factor = Float.exp(t * 2.0) - 1.0;
        let max_exp = Float.exp(2.0) - 1.0;
        p0 + (p1 - p0) * (exp_factor / max_exp);
      };
      case (#logarithmic) {
        let log_factor = Float.log(1.0 + t) / Float.log(2.0);
        p0 + (p1 - p0) * log_factor;
      };
    };

    #ok(price)
  };

  /**
   * Calculate tokens received for a given base currency amount (buy)
   */
  private func calculateBuyReturn(
    token_id : Nat,
    base_amount : Nat
  ) : Result.Result<BuyQuote, Text> {
    
    let config = switch (token_configs.get(token_id)) {
      case (null) return #err("Token not registered");
      case (?c) c;
    };

    let state = switch (token_states.get(token_id)) {
      case (null) return #err("Token state not found");
      case (?s) s;
    };

    // Check minimum trade amount
    if (base_amount < config.min_trade_amount) {
      return #err("Below minimum trade amount: " # Nat.toText(config.min_trade_amount) # 
                  " " # basePairToText(config.base_pair));
    };

    // Check maximum trade amount
    if (base_amount > config.max_trade_amount) {
      return #err("Exceeds maximum trade amount: " # Nat.toText(config.max_trade_amount) # 
                  " " # basePairToText(config.base_pair));
    };

    // Calculate fee
    let fee = (base_amount * config.fee_percent) / FEE_DENOMINATOR;
    if (base_amount <= fee) {
      return #err("Amount too small after fees");
    };
    
    let amount_after_fee = base_amount - fee;

    // Get current price
    let current_price = switch (calculatePrice(token_id)) {
      case (#err(e)) return #err(e);
      case (#ok(p)) p;
    };

    // Calculate tokens
    let tokens_approximate = fromFloat(toFloat(amount_after_fee) / current_price);

    // Check supply constraints
    let tokens_available = config.max_supply - state.tokens_minted;
    let tokens_to_mint = if (tokens_approximate > tokens_available) {
      tokens_available;
    } else {
      tokens_approximate;
    };

    if (tokens_to_mint == 0) {
      return #err("No tokens available for purchase");
    };

    // Calculate price after trade
    let new_supply = state.tokens_minted + tokens_to_mint;
    let t_after = toFloat(new_supply) / toFloat(config.graduation_threshold);
    let p0 = toFloat(config.initial_price);
    let p1 = toFloat(config.price_at_graduation);
    
    let price_after = switch (config.curve_type) {
      case (#linear) p0 + (p1 - p0) * t_after;
      case (#quadratic) p0 + (p1 - p0) * t_after * t_after;
      case (#exponential) {
        let exp_factor = Float.exp(t_after * 2.0) - 1.0;
        let max_exp = Float.exp(2.0) - 1.0;
        p0 + (p1 - p0) * (exp_factor / max_exp);
      };
      case (#logarithmic) {
        let log_factor = Float.log(1.0 + t_after) / Float.log(2.0);
        p0 + (p1 - p0) * log_factor;
      };
    };

    let average_price = toFloat(amount_after_fee) / toFloat(tokens_to_mint);
    let price_impact = if (current_price > 0.0) {
      ((price_after - current_price) / current_price) * 100.0;
    } else {
      0.0;
    };
    let slippage = if (current_price > 0.0) {
      ((average_price - current_price) / current_price) * 100.0;
    } else {
      0.0;
    };

    #ok({
      tokens_out = tokens_to_mint;
      current_price = current_price;
      average_price = average_price;
      price_after = price_after;
      fee = fee;
      price_impact = price_impact;
      slippage = slippage;
    })
  };

  /**
   * Calculate base currency received for selling tokens
   */
  private func calculateSellReturn(
    token_id : Nat,
    token_amount : Nat
  ) : Result.Result<SellQuote, Text> {
    
    if (token_amount == 0) {
      return #err("Cannot sell zero tokens");
    };

    let config = switch (token_configs.get(token_id)) {
      case (null) return #err("Token not registered");
      case (?c) c;
    };

    let state = switch (token_states.get(token_id)) {
      case (null) return #err("Token state not found");
      case (?s) s;
    };

    // Get current price
    let current_price = switch (calculatePrice(token_id)) {
      case (#err(e)) return #err(e);
      case (#ok(p)) p;
    };

    // Calculate base currency value before fees
    let base_before_fee = fromFloat(toFloat(token_amount) * current_price);
    
    if (base_before_fee == 0) {
      return #err("Token amount too small");
    };

    // Calculate fee
    let fee = (base_before_fee * config.fee_percent) / FEE_DENOMINATOR;
    if (base_before_fee <= fee) {
      return #err("Amount too small after fees");
    };

    let base_after_fee = base_before_fee - fee;

    // Check minimum trade amount
    if (base_after_fee < config.min_trade_amount) {
      return #err("Sell amount below minimum trade amount: " # Nat.toText(config.min_trade_amount) # 
                  " " # basePairToText(config.base_pair));
    };

    // Check maximum trade amount
    if (base_after_fee > config.max_trade_amount) {
      return #err("Sell amount exceeds maximum trade amount: " # Nat.toText(config.max_trade_amount) # 
                  " " # basePairToText(config.base_pair));
    };

    // Calculate price after trade
    let new_supply = if (state.tokens_minted >= token_amount) {
      state.tokens_minted - token_amount;
    } else {
      0;
    };
    
    let t_after = toFloat(new_supply) / toFloat(config.graduation_threshold);
    let p0 = toFloat(config.initial_price);
    let p1 = toFloat(config.price_at_graduation);
    
    let price_after = switch (config.curve_type) {
      case (#linear) p0 + (p1 - p0) * t_after;
      case (#quadratic) p0 + (p1 - p0) * t_after * t_after;
      case (#exponential) {
        let exp_factor = Float.exp(t_after * 2.0) - 1.0;
        let max_exp = Float.exp(2.0) - 1.0;
        p0 + (p1 - p0) * (exp_factor / max_exp);
      };
      case (#logarithmic) {
        let log_factor = Float.log(1.0 + t_after) / Float.log(2.0);
        p0 + (p1 - p0) * log_factor;
      };
    };

    let average_price = toFloat(base_before_fee) / toFloat(token_amount);
    let price_impact = if (current_price > 0.0) {
      ((price_after - current_price) / current_price) * 100.0;
    } else {
      0.0;
    };
    let slippage = if (current_price > 0.0) {
      ((current_price - average_price) / current_price) * 100.0;
    } else {
      0.0;
    };

    #ok({
      base_out = base_after_fee;
      current_price = current_price;
      average_price = average_price;
      price_after = price_after;
      fee = fee;
      price_impact = price_impact;
      slippage = slippage;
    })
  };

  // ========================================
  // TOKEN REGISTRATION
  // ========================================

  /**
   * Register a new token with the bonding curve
   * 
   * CRITICAL: The base_pair parameter LOCKS which currency can trade this token
   * - If registered with ckBTC → ONLY ckBTC trades allowed
   * - If registered with ckETH → ONLY ckETH trades allowed
   * - Cross-pair trading is IMPOSSIBLE and BLOCKED
   * 
   * @param min_trade_amount - Minimum base currency per trade
   * @param max_trade_amount - Maximum base currency per trade
   */
  public shared ({ caller }) func registerToken(
    token_canister : Principal,
    base_pair : BasePair,
    curve_type : CurveType,
    initial_price : Nat,
    price_at_graduation : Nat,
    fee_percent : Nat,
    min_trade_amount : Nat,
    max_trade_amount : Nat
  ) : async Result.Result<{ token_id : Nat; subaccount : [Nat8] }, Text> {

    // Validate: token not already registered
    switch (canister_to_token_id.get(token_canister)) {
      case (?_) return #err("Token already registered");
      case null {};
    };

    // Validate: prices make sense
    if (initial_price >= price_at_graduation) {
      return #err("Initial price must be less than graduation price");
    };

    if (price_at_graduation == 0) {
      return #err("Graduation price cannot be zero");
    };

    // Validate: fee is reasonable (max 50%)
    if (fee_percent > 5000) {
      return #err("Fee percent too high (max 5000 = 50%)");
    };

    // Validate: trade limits make sense
    if (min_trade_amount == 0) {
      return #err("Minimum trade amount must be greater than zero");
    };

    if (max_trade_amount == 0) {
      return #err("Maximum trade amount must be greater than zero");
    };

    if (min_trade_amount >= max_trade_amount) {
      return #err("Minimum trade amount must be less than maximum trade amount");
    };

    // Generate unique token ID
    let token_id = next_token_id;
    next_token_id += 1;

    // Calculate supply parameters based on base pair
    let max_supply = getMaxSupply(base_pair);
    let graduation_threshold = calculateGraduationThreshold(max_supply);

    // Register with vault to get isolated subaccount
    let vault : VaultInterface = actor (Principal.toText(vault_canister));
    let vault_subaccount = switch (await vault.registerToken(token_id, base_pair)) {
      case (#err(msg)) return #err("Vault registration failed: " # msg);
      case (#ok(subaccount)) subaccount;
    };

    // Create token configuration
    let config : TokenConfig = {
      token_id = token_id;
      token_canister = token_canister;
      base_pair = base_pair;  // LOCKED - determines tradable currency
      vault_subaccount = vault_subaccount;
      curve_type = curve_type;
      initial_price = initial_price;
      price_at_graduation = price_at_graduation;
      fee_percent = fee_percent;
      min_trade_amount = min_trade_amount;
      max_trade_amount = max_trade_amount;
      max_supply = max_supply;
      graduation_threshold = graduation_threshold;
      created_at = Time.now();
      creator = caller;
    };

    // Initialize token state
    let state : TokenState = {
      tokens_minted = 0;
      total_base_raised = 0;
      protocol_fees_collected = 0;
      is_graduated = false;
      trade_count = 0;
      last_trade_price = toFloat(initial_price);
    };

    // Store in state
    token_configs.put(token_id, config);
    token_states.put(token_id, state);
    canister_to_token_id.put(token_canister, token_id);
    trade_history.put(token_id, []);

    #ok({
      token_id = token_id;
      subaccount = vault_subaccount;
    })
  };

  // ========================================
  // TRADING FUNCTIONS
  // ========================================

  /**
   * BUY: Purchase tokens with base currency
   * 
   * BASE PAIR ENFORCEMENT:
   * - Token registered with ckBTC → User must use ckBTC
   * - Token registered with ckETH → User must use ckETH
   * - Wrong base pair → Transaction REJECTED
   * 
   * TRADE LIMITS ENFORCED:
   * - base_amount >= min_trade_amount
   * - base_amount <= max_trade_amount
   * 
   * Flow:
   * 1. Validate caller and parameters
   * 2. Check token is not graduated
   * 3. Verify correct base pair being used
   * 4. Calculate tokens to mint (with slippage check)
   * 5. Pull base currency from user to vault
   * 6. Mint tokens to user
   * 7. Update state and check graduation
   */
  public shared ({ caller }) func buy(
    token_id : Nat,
    base_amount : Nat,
    min_tokens_out : Nat
  ) : async Result.Result<Nat, Text> {

    if (Principal.isAnonymous(caller)) {
      return #err("Anonymous callers not allowed");
    };

    let config = switch (token_configs.get(token_id)) {
      case (null) return #err("Token not registered");
      case (?c) c;
    };

    let state = switch (token_states.get(token_id)) {
      case (null) return #err("Token state not found");
      case (?s) s;
    };

    // Check not graduated
    if (state.is_graduated) {
      return #err("Token has graduated - trading paused at 80% supply. Ready for DEX migration.");
    };

    // Calculate buy quote (validates min/max trade amounts)
    let quote = switch (calculateBuyReturn(token_id, base_amount)) {
      case (#err(e)) return #err(e);
      case (#ok(q)) q;
    };

    // Check slippage protection
    if (quote.tokens_out < min_tokens_out) {
      return #err("Slippage exceeded. Expected minimum " # Nat.toText(min_tokens_out) # 
                  " but would receive " # Nat.toText(quote.tokens_out));
    };

    // Pull base currency from user to vault
    // IMPORTANT: This enforces base pair - vault will reject wrong currency
    let vault : VaultInterface = actor (Principal.toText(vault_canister));
    switch (await vault.pullFunds(token_id, config.base_pair, caller, base_amount)) {
      case (#err(msg)) {
        return #err("Failed to pull " # basePairToText(config.base_pair) # 
                    " from user. Ensure you have approved the bonding curve. Error: " # msg);
      };
      case (#ok(_)) {};
    };

    // Mint tokens to user (bonding curve is the minter)
    let token_ledger : TokenLedger = actor (Principal.toText(config.token_canister));
    let mint_result = await token_ledger.icrc1_transfer({
      from_subaccount = null;
      to = { owner = caller; subaccount = null };
      amount = quote.tokens_out;
      fee = ?0;
      memo = ?Blob.toArray(Text.encodeUtf8("Bonding curve buy"));
      created_at_time = ?Nat64.fromNat(Int.abs(Time.now()));
    });

    // Handle minting failure with rollback
    switch (mint_result) {
      case (#Err(e)) {
        // Rollback: Return base currency to user
        ignore await vault.payFunds(token_id, config.base_pair, caller, base_amount);
        return #err("Token minting failed. Funds returned. Error: " # debug_show(e));
      };
      case (#Ok(_)) {};
    };

    // Update token state
    let new_supply = state.tokens_minted + quote.tokens_out;
    let newly_graduated = new_supply >= config.graduation_threshold;
    
    let updated_state : TokenState = {
      tokens_minted = new_supply;
      total_base_raised = state.total_base_raised + base_amount;
      protocol_fees_collected = state.protocol_fees_collected + quote.fee;
      is_graduated = newly_graduated;
      trade_count = state.trade_count + 1;
      last_trade_price = quote.average_price;
    };
    token_states.put(token_id, updated_state);

    // Record trade in history
    recordTrade({
      token_id = token_id;
      user = caller;
      trade_type = #buy;
      base_amount = base_amount;
      token_amount = quote.tokens_out;
      price = quote.average_price;
      fee = quote.fee;
      timestamp = Time.now();
    });

    #ok(quote.tokens_out)
  };

  /**
   * SELL: Sell tokens back to the bonding curve for base currency
   * 
   * BASE PAIR ENFORCEMENT:
   * - Token registered with ckBTC → User receives ckBTC
   * - Token registered with ckETH → User receives ckETH
   * - Vault ensures correct currency is paid
   * 
   * TRADE LIMITS ENFORCED:
   * - Sell value >= min_trade_amount
   * - Sell value <= max_trade_amount
   * 
   * Flow:
   * 1. Validate caller and parameters
   * 2. Check token is not graduated
   * 3. Calculate base currency to receive (validates limits)
   * 4. Transfer tokens from user to bonding curve
   * 5. Burn tokens
   * 6. Pay base currency from vault to user
   * 7. Update state
   */
  public shared ({ caller }) func sell(
    token_id : Nat,
    token_amount : Nat,
    min_base_out : Nat
  ) : async Result.Result<Nat, Text> {

    if (Principal.isAnonymous(caller)) {
      return #err("Anonymous callers not allowed");
    };

    let config = switch (token_configs.get(token_id)) {
      case (null) return #err("Token not registered");
      case (?c) c;
    };

    let state = switch (token_states.get(token_id)) {
      case (null) return #err("Token state not found");
      case (?s) s;
    };

    // Check not graduated
    if (state.is_graduated) {
      return #err("Token has graduated - trading paused at 80% supply. Ready for DEX migration.");
    };

    // Calculate sell quote (validates min/max trade amounts)
    let quote = switch (calculateSellReturn(token_id, token_amount)) {
      case (#err(e)) return #err(e);
      case (#ok(q)) q;
    };

    // Check slippage protection
    if (quote.base_out < min_base_out) {
      return #err("Slippage exceeded. Expected minimum " # Nat.toText(min_base_out) # 
                  " " # basePairToText(config.base_pair) # 
                  " but would receive " # Nat.toText(quote.base_out));
    };

    // Check vault has sufficient liquidity
    let vault : VaultInterface = actor (Principal.toText(vault_canister));
    let vault_balance = switch (await vault.getBalanceAsync(token_id, config.base_pair)) {
      case (#err(msg)) return #err("Failed to check vault balance: " # msg);
      case (#ok(balance)) balance;
    };

    if (vault_balance < quote.base_out) {
      return #err("Insufficient liquidity in vault. Available: " # Nat.toText(vault_balance) # 
                  " " # basePairToText(config.base_pair));
    };

    // Transfer tokens from user to bonding curve (will be burned)
    let token_ledger : TokenLedger = actor (Principal.toText(config.token_canister));
    let transfer_result = await token_ledger.icrc2_transfer_from({
      spender_subaccount = null;
      from = { owner = caller; subaccount = null };
      to = { owner = Principal.fromActor(this); subaccount = null };
      amount = token_amount;
      fee = ?0;
      memo = ?Blob.toArray(Text.encodeUtf8("Bonding curve sell"));
      created_at_time = ?Nat64.fromNat(Int.abs(Time.now()));
    });

    // Handle transfer failure
    switch (transfer_result) {
      case (#Err(e)) {
        return #err("Token transfer failed. Ensure you have approved the bonding curve. Error: " # debug_show(e));
      };
      case (#Ok(_)) {};
    };

    // Burn the tokens (transfer to burn subaccount)
    let burn_result = await token_ledger.icrc1_transfer({
      from_subaccount = null;
      to = { owner = Principal.fromActor(this); subaccount = ?Blob.toArray(Text.encodeUtf8("burn")) };
      amount = token_amount;
      fee = ?0;
      memo = ?Blob.toArray(Text.encodeUtf8("Burn"));
      created_at_time = ?Nat64.fromNat(Int.abs(Time.now()));
    });

    // If burn fails, return tokens to user
    switch (burn_result) {
      case (#Err(e)) {
        ignore await token_ledger.icrc1_transfer({
          from_subaccount = null;
          to = { owner = caller; subaccount = null };
          amount = token_amount;
          fee = ?0;
          memo = ?Blob.toArray(Text.encodeUtf8("Burn failed - rollback"));
          created_at_time = ?Nat64.fromNat(Int.abs(Time.now()));
        });
        return #err("Token burn failed. Tokens returned. Error: " # debug_show(e));
      };
      case (#Ok(_)) {};
    };

    // Pay base currency to user from vault
    // IMPORTANT: Vault enforces correct base pair
    switch (await vault.payFunds(token_id, config.base_pair, caller, quote.base_out)) {
      case (#err(msg)) {
        return #err("CRITICAL: Tokens burned but payment failed: " # msg # 
                    ". Contact admin for recovery.");
      };
      case (#ok(_)) {};
    };

    // Update token state
    let new_supply = if (state.tokens_minted >= token_amount) {
      state.tokens_minted - token_amount;
    } else {
      0;
    };
    
    let updated_state : TokenState = {
      tokens_minted = new_supply;
      total_base_raised = if (state.total_base_raised >= quote.base_out) {
        state.total_base_raised - quote.base_out;
      } else {
        0;
      };
      protocol_fees_collected = state.protocol_fees_collected + quote.fee;
      is_graduated = state.is_graduated;
      trade_count = state.trade_count + 1;
      last_trade_price = quote.average_price;
    };
    token_states.put(token_id, updated_state);

    // Record trade in history
    recordTrade({
      token_id = token_id;
      user = caller;
      trade_type = #sell;
      base_amount = quote.base_out;
      token_amount = token_amount;
      price = quote.average_price;
      fee = quote.fee;
      timestamp = Time.now();
    });

    #ok(quote.base_out)
  };

  // ========================================
  // QUERY FUNCTIONS
  // ========================================

  /**
   * Get configuration for a specific token
   * Shows the LOCKED base pair for this token
   */
  public query func getTokenConfig(token_id : Nat) : async ?TokenConfig {
    token_configs.get(token_id)
  };

  /**
   * Get current state for a specific token
   */
  public query func getTokenState(token_id : Nat) : async ?TokenState {
    token_states.get(token_id)
  };

  /**
   * Get all registered tokens
   */
  public query func getAllTokens() : async [TokenConfig] {
    Iter.toArray(token_configs.vals())
  };

  /**
   * Get token ID by canister principal
   */
  public query func getTokenIdByCanister(canister : Principal) : async ?Nat {
    canister_to_token_id.get(canister)
  };

  /**
   * Get current price for a token
   * Price is in base currency smallest units (satoshis for ckBTC, wei for ckETH)
   */
  public query func getCurrentPrice(token_id : Nat) : async Result.Result<Float, Text> {
    calculatePrice(token_id)
  };

  /**
   * Get buy quote - shows what base pair is required
   */
  public query func getBuyQuote(
    token_id : Nat,
    base_amount : Nat
  ) : async Result.Result<BuyQuote, Text> {
    calculateBuyReturn(token_id, base_amount)
  };

  /**
   * Get sell quote - shows what base pair will be received
   */
  public query func getSellQuote(
    token_id : Nat,
    token_amount : Nat
  ) : async Result.Result<SellQuote, Text> {
    calculateSellReturn(token_id, token_amount)
  };

  /**
   * Get recent trade history for a token
   */
  public query func getTradeHistory(token_id : Nat) : async [TradeInfo] {
    Option.get(trade_history.get(token_id), [])
  };

  /**
   * Get comprehensive stats for a token
   */
  public query func getTokenStats(token_id : Nat) : async Result.Result<{
    config : TokenConfig;
    state : TokenState;
    current_price : Float;
    market_cap : Float;
    progress_to_graduation : Float;
    total_trades : Nat;
  }, Text> {
    
    let config = switch (token_configs.get(token_id)) {
      case (null) return #err("Token not registered");
      case (?c) c;
    };

    let state = switch (token_states.get(token_id)) {
      case (null) return #err("Token state not found");
      case (?s) s;
    };

    let current_price = switch (calculatePrice(token_id)) {
      case (#err(e)) return #err(e);
      case (#ok(p)) p;
    };

    let market_cap = current_price * toFloat(state.tokens_minted);
    
    let progress = if (config.graduation_threshold > 0) {
      (toFloat(state.tokens_minted) / toFloat(config.graduation_threshold)) * 100.0;
    } else {
      0.0;
    };

    #ok({
      config = config;
      state = state;
      current_price = current_price;
      market_cap = market_cap;
      progress_to_graduation = Float.min(progress, 100.0);
      total_trades = state.trade_count;
    })
  };

  /**
   * Get tokens by base pair
   * Useful for filtering: "Show me all ckBTC tokens" or "Show me all ckETH tokens"
   */
  public query func getTokensByBasePair(base_pair : BasePair) : async [TokenConfig] {
    let buffer = Buffer.Buffer<TokenConfig>(0);
    for (config in token_configs.vals()) {
      if (config.base_pair == base_pair) {
        buffer.add(config);
      };
    };
    Buffer.toArray(buffer)
  };

  /**
   * Get graduated tokens (reached 80% supply, trading paused)
   */
  public query func getGraduatedTokens() : async [{
    token_id : Nat;
    config : TokenConfig;
    state : TokenState;
  }] {
    let buffer = Buffer.Buffer<{token_id : Nat; config : TokenConfig; state : TokenState}>(0);
    for ((id, state) in token_states.entries()) {
      if (state.is_graduated) {
        switch (token_configs.get(id)) {
          case (?config) {
            buffer.add({
              token_id = id;
              config = config;
              state = state;
            });
          };
          case null {};
        };
      };
    };
    Buffer.toArray(buffer)
  };

  /**
   * Get active (non-graduated) tokens
   */
  public query func getActiveTokens() : async [{
    token_id : Nat;
    config : TokenConfig;
    state : TokenState;
  }] {
    let buffer = Buffer.Buffer<{token_id : Nat; config : TokenConfig; state : TokenState}>(0);
    for ((id, state) in token_states.entries()) {
      if (not state.is_graduated) {
        switch (token_configs.get(id)) {
          case (?config) {
            buffer.add({
              token_id = id;
              config = config;
              state = state;
            });
          };
          case null {};
        };
      };
    };
    Buffer.toArray(buffer)
  };

  /**
   * Get trade limits for a token
   * Shows min and max trade amounts in the token's base currency
   */
  public query func getTradeLimits(token_id : Nat) : async Result.Result<{
    base_pair : BasePair;
    min_trade_amount : Nat;
    max_trade_amount : Nat;
    base_pair_name : Text;
  }, Text> {
    let config = switch (token_configs.get(token_id)) {
      case (null) return #err("Token not registered");
      case (?c) c;
    };

    #ok({
      base_pair = config.base_pair;
      min_trade_amount = config.min_trade_amount;
      max_trade_amount = config.max_trade_amount;
      base_pair_name = basePairToText(config.base_pair);
    })
  };

  // ========================================
  // ADMIN FUNCTIONS
  // ========================================

  /**
   * Withdraw collected protocol fees
   * Fees are in the token's base currency (ckBTC or ckETH)
   */
  public shared ({ caller }) func withdrawFees(
    token_id : Nat
  ) : async Result.Result<Nat, Text> {
    
    if (caller != owner) {
      return #err("Only owner can withdraw fees");
    };

    let state = switch (token_states.get(token_id)) {
      case (null) return #err("Token not found");
      case (?s) s;
    };

    if (state.protocol_fees_collected == 0) {
      return #err("No fees to withdraw");
    };

    let config = switch (token_configs.get(token_id)) {
      case (null) return #err("Token config not found");
      case (?c) c;
    };

    // Withdraw from vault in the correct base currency
    let vault : VaultInterface = actor (Principal.toText(vault_canister));
    switch (await vault.payFunds(token_id, config.base_pair, owner, state.protocol_fees_collected)) {
      case (#err(msg)) return #err("Withdrawal failed: " # msg);
      case (#ok(_)) {
        let withdrawn_amount = state.protocol_fees_collected;
        
        // Reset fees counter
        let updated_state = {
          tokens_minted = state.tokens_minted;
          total_base_raised = state.total_base_raised;
          protocol_fees_collected = 0;
          is_graduated = state.is_graduated;
          trade_count = state.trade_count;
          last_trade_price = state.last_trade_price;
        };
        token_states.put(token_id, updated_state);
        
        #ok(withdrawn_amount)
      };
    };
  };

  /**
   * Emergency pause for a specific token
   * Marks token as graduated to pause trading
   */
  public shared ({ caller }) func emergencyPause(
    token_id : Nat
  ) : async Result.Result<Text, Text> {
    
    if (caller != owner) {
      return #err("Only owner can emergency pause");
    };

    let state = switch (token_states.get(token_id)) {
      case (null) return #err("Token not found");
      case (?s) s;
    };

    let updated_state = {
      tokens_minted = state.tokens_minted;
      total_base_raised = state.total_base_raised;
      protocol_fees_collected = state.protocol_fees_collected;
      is_graduated = true;
      trade_count = state.trade_count;
      last_trade_price = state.last_trade_price;
    };
    
    token_states.put(token_id, updated_state);
    #ok("Token trading paused via emergency stop")
  };

  /**
   * Get owner principal
   */
  public query func getOwner() : async Principal {
    owner
  };

  /**
   * Get vault canister principal
   */
  public query func getVaultCanister() : async Principal {
    vault_canister
  };

  /**
   * Get total number of registered tokens
   */
  public query func getTotalTokensRegistered() : async Nat {
    token_configs.size()
  };

  /**
   * Get platform statistics
   */
  public query func getPlatformStats() : async {
    total_tokens : Nat;
    total_graduated : Nat;
    total_active : Nat;
    tokens_by_base_pair : {
      ckBTC : Nat;
      ckETH : Nat;
    };
  } {
    var graduated_count = 0;
    var ckbtc_count = 0;
    var cketh_count = 0;

    for ((id, state) in token_states.entries()) {
      if (state.is_graduated) {
        graduated_count += 1;
      };
    };

    for (config in token_configs.vals()) {
      switch (config.base_pair) {
        case (#ckBTC) ckbtc_count += 1;
        case (#ckETH) cketh_count += 1;
      };
    };

    let total = token_configs.size();
    let active = total - graduated_count;

    {
      total_tokens = total;
      total_graduated = graduated_count;
      total_active = active;
      tokens_by_base_pair = {
        ckBTC = ckbtc_count;
        ckETH = cketh_count;
      };
    }
  };

  // ========================================
  // SYSTEM FUNCTIONS (Upgrade Handling)
  // ========================================

  system func preupgrade() {
    stable_token_configs := Iter.toArray(token_configs.entries());
    stable_token_states := Iter.toArray(token_states.entries());
    stable_canister_to_token_id := Iter.toArray(canister_to_token_id.entries());
    stable_next_token_id := next_token_id;
  };

  system func postupgrade() {
    token_configs := TrieMap.fromEntries<Nat, TokenConfig>(
      stable_token_configs.vals(),
      Nat.equal,
      Hash.hash
    );
    
    token_states := TrieMap.fromEntries<Nat, TokenState>(
      stable_token_states.vals(),
      Nat.equal,
      Hash.hash
    );
    
    canister_to_token_id := TrieMap.fromEntries<Principal, Nat>(
      stable_canister_to_token_id.vals(),
      Principal.equal,
      Principal.hash
    );
    
    next_token_id := stable_next_token_id;

    // Clear stable storage
    stable_token_configs := [];
    stable_token_states := [];
    stable_canister_to_token_id := [];
  };
}