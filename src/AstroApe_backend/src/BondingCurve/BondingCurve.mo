import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Debug "mo:base/Debug";
import Error "mo:base/Error";
import Float "mo:base/Float";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Nat8 "mo:base/Nat8";
import Option "mo:base/Option";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Time "mo:base/Time";
import TrieMap "mo:base/TrieMap";
import Int "mo:base/Int";

shared ({ caller = owner }) actor class ImprovedBondingCurve(
  init_params : {
    curve_id : Nat;
    curve_type : { #quadratic; #logarithmic; #linear; #exponential };
    base_pair : { #ckBTC; #ckETH };
    token_canister : Principal;
    initial_price : Nat; // In smallest units (sats or wei)
    price_at_80_percent : Nat;
    fee_percent : Nat; // Basis points (1% = 100)
    min_trade_amount : Nat;
    vault_canister : Principal;
  }
) = this {
  
  // ===== TYPES =====
  
  public type BasePair = {
    #ckBTC;  // 8 decimals, satoshis
    #ckETH;  // 18 decimals, wei
  };
  
  public type TradeInfo = {
    user : Principal;
    amount_in : Nat;
    amount_out : Nat;
    price : Float;
    timestamp : Int;
    trade_type : { #buy; #sell };
  };

  public type CurveStats = {
    tokens_minted : Nat;
    total_base_raised : Nat;
    current_price : Float;
    market_cap : Float;
    progress_to_graduation : Float;
    is_graduated : Bool;
    base_pair : BasePair;
    max_supply : Nat;
    graduation_threshold : Nat;
  };
  
  // ICRC Account
  public type Account = {
    owner : Principal;
    subaccount : ?[Nat8];
  };
  
  public type TransferArgs = {
    from_subaccount : ?[Nat8];
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
  
  // Token Ledger Interface (minting)
  public type TokenLedger = actor {
    icrc1_transfer : (TransferArgs) -> async (TransferResult);
    icrc1_balance_of : (Account) -> async (Nat);
  };
  
  // Vault Interface
  public type VaultInterface = actor {
    registerCurve : (Nat, BasePair) -> async (Result.Result<[Nat8], Text>);
    pullFunds : (Nat, Principal, Nat) -> async (Result.Result<Nat, Text>);
    payFunds : (Nat, Principal, Nat) -> async (Result.Result<Nat, Text>);
    getBalance : (Nat) -> async (Result.Result<Nat, Text>);
  };
  
  // ===== CONSTANTS =====
  
  private let BITCOIN_SUPPLY : Nat = 21_000_000;
  private let ETHEREUM_SUPPLY : Nat = 1_000_000_000;
  private let SATOSHI_DECIMALS : Nat8 = 8;
  private let WEI_DECIMALS : Nat8 = 18;
  
  // ===== STATE =====
  
  private var tokens_minted : Nat = 0;
  private var total_base_raised : Nat = 0;
  private var protocol_fees : Nat = 0;
  private var is_graduated : Bool = false;
  private var trade_count : Nat = 0;
  private var vault_registered : Bool = false;
  
  // Derived constants based on base pair
  private let max_supply : Nat = switch (init_params.base_pair) {
    case (#ckBTC) { BITCOIN_SUPPLY * (10 ** Nat8.toNat(SATOSHI_DECIMALS)) };
    case (#ckETH) { ETHEREUM_SUPPLY * (10 ** Nat8.toNat(WEI_DECIMALS)) };
  };
  
  private let graduation_threshold : Nat = (max_supply * 80) / 100; // 80% of max supply
  
  private let base_decimals : Nat8 = switch (init_params.base_pair) {
    case (#ckBTC) { SATOSHI_DECIMALS };
    case (#ckETH) { WEI_DECIMALS };
  };
  
  private var balances = TrieMap.TrieMap<Principal, Nat>(
    Principal.equal, 
    Principal.hash
  );
  
  private var recent_trades = Array.init<TradeInfo>(100, {
    user = owner;
    amount_in = 0;
    amount_out = 0;
    price = 0.0;
    timestamp = 0;
    trade_type = #buy;
  });
  private var trade_index : Nat = 0;
  
  // Stable variables for upgrades
  private stable var stable_balances : [(Principal, Nat)] = [];
  private stable var stable_tokens_minted : Nat = 0;
  private stable var stable_total_base_raised : Nat = 0;
  private stable var stable_protocol_fees : Nat = 0;
  private stable var stable_is_graduated : Bool = false;
  private stable var stable_trade_count : Nat = 0;
  private stable var stable_vault_registered : Bool = false;

  // ===== INITIALIZATION =====
  
  public shared func registerWithVault() : async Result.Result<Text, Text> {
    if (vault_registered) {
      return #ok("Already registered with vault");
    };
    
    let vault : VaultInterface = actor(Principal.toText(init_params.vault_canister));
    
    switch (await vault.registerCurve(init_params.curve_id, init_params.base_pair)) {
      case (#err(msg)) { #err("Vault registration failed: " # msg) };
      case (#ok(subaccount)) {
        vault_registered := true;
        #ok("Registered with vault, subaccount: " # debug_show(subaccount))
      };
    }
  };

  // ===== MATH UTILS =====
  
  private func safeIntToNat(i : Int) : Nat {
    if (i >= 0) {
      Int.abs(i);
    } else {
      0;
    }
  };

  private func min(a : Nat, b : Nat) : Nat {
    if (a < b) a else b;
  };

  private func max(a : Nat, b : Nat) : Nat {
    if (a > b) a else b;
  };
  
  private func toFloat(amount : Nat) : Float {
    Float.fromInt(amount)
  };
  
  private func fromFloat(amount : Float) : Nat {
    let rounded = Float.toInt(Float.nearest(amount));
    safeIntToNat(rounded)
  };

  // ===== BONDING CURVE CALCULATIONS =====
  
  private func calculate_price() : Float {
    if (is_graduated) {
      return Float.fromInt(init_params.price_at_80_percent);
    };

    let current = Float.fromInt(tokens_minted);
    let max_curve = Float.fromInt(graduation_threshold);

    if (tokens_minted >= graduation_threshold) {
      return Float.fromInt(init_params.price_at_80_percent);
    };

    let p0 = Float.fromInt(init_params.initial_price);
    let p1 = Float.fromInt(init_params.price_at_80_percent);
    let t = current / (if (max_curve == 0.0) 1.0 else max_curve);
    
    switch (init_params.curve_type) {
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
    }
  };

  private func calculate_buy_return(base_amount : Nat) : Result.Result<Nat, Text> {
    if (base_amount < init_params.min_trade_amount) {
      return #err("Amount below minimum trade size");
    };
    
    if (is_graduated) {
      return #err("Token has graduated - trading on DEX");
    };

    let current_price = calculate_price();
    let fee = (base_amount * init_params.fee_percent) / 10000;
    if (base_amount <= fee) return #err("Amount too small after fees");
    let amount_after_fee = base_amount - fee;
    
    if (amount_after_fee == 0) return #err("Amount too small after fees");
    
    let float_amount = toFloat(amount_after_fee);
    let tokens = float_amount / current_price;
    let tokens_nat = fromFloat(tokens);
    
    if (tokens_minted + tokens_nat > max_supply) {
      let remaining = max_supply - tokens_minted;
      if (remaining == 0) return #err("No tokens available");
      #ok(remaining);
    } else {
      #ok(tokens_nat);
    }
  };

  private func calculate_sell_return(token_amount : Nat) : Result.Result<Nat, Text> {
    if (token_amount == 0) return #err("Zero amount");
    if (is_graduated) return #err("Token has graduated - use DEX");
    
    let current_price = calculate_price();
    let float_value = toFloat(token_amount) * current_price;
    let base_before_fee = fromFloat(float_value);
    
    if (base_before_fee == 0) return #err("Amount too small");
    
    let fee = (base_before_fee * init_params.fee_percent) / 10000;
    if (base_before_fee <= fee) return #err("Amount too small after fees");
    let base_amount = base_before_fee - fee;
    
    if (base_amount == 0) {
      #err("Amount too small after fees")
    } else {
      #ok(base_amount)
    }
  };

  private func record_trade(
    user : Principal, 
    amount_in : Nat, 
    amount_out : Nat, 
    trade_type : { #buy; #sell }
  ) {
    let trade : TradeInfo = {
      user = user;
      amount_in = amount_in;
      amount_out = amount_out;
      price = calculate_price();
      timestamp = Time.now();
      trade_type = trade_type;
    };
    
    recent_trades[trade_index] := trade;
    trade_index := (trade_index + 1) % 100;
    trade_count += 1;
  };

  private func check_graduation() : Bool {
    if (tokens_minted >= graduation_threshold and not is_graduated) {
      is_graduated := true;
      true;
    } else {
      false;
    }
  };

  // ===== CORE FUNCTIONS =====
  
  public shared ({ caller }) func buy(base_amount : Nat) : async Result.Result<Nat, Text> {
    if (Principal.isAnonymous(caller)) {
      return #err("Anonymous caller not allowed");
    };
    
    if (not vault_registered) {
      return #err("Vault not registered");
    };

    // Calculate tokens to mint
    let calculate_result = calculate_buy_return(base_amount);
    let tokens = switch (calculate_result) {
      case (#err(msg)) return #err(msg);
      case (#ok(t)) t;
    };
    
    // Pull funds from user to vault
    let vault : VaultInterface = actor(Principal.toText(init_params.vault_canister));
    
    switch (await vault.pullFunds(init_params.curve_id, caller, base_amount)) {
      case (#err(msg)) { return #err("Failed to pull funds: " # msg) };
      case (#ok(_)) {
        // Mint tokens to user
        let token_ledger : TokenLedger = actor(Principal.toText(init_params.token_canister));
        
        let transfer_args : TransferArgs = {
          from_subaccount = null;
          to = { owner = caller; subaccount = null };
          amount = tokens;
          fee = ?0; // No fee for minting
          memo = ?Blob.toArray(Text.encodeUtf8("BC buy"));
          created_at_time = ?Nat64.fromNat(Int.abs(Time.now()));
        };
        
        switch (await token_ledger.icrc1_transfer(transfer_args)) {
          case (#Err(e)) {
            // Rollback: return funds to user
            ignore await vault.payFunds(init_params.curve_id, caller, base_amount);
            return #err("Failed to mint tokens: " # debug_show(e));
          };
          case (#Ok(_)) {
            // Update state
            let current_balance = Option.get(balances.get(caller), 0);
            balances.put(caller, current_balance + tokens);
            tokens_minted += tokens;
            total_base_raised += base_amount;
            
            let fee = (base_amount * init_params.fee_percent) / 10000;
            protocol_fees += fee;
            
            record_trade(caller, base_amount, tokens, #buy);
            
            // Check if token should graduate
            ignore check_graduation();
            
            #ok(tokens);
          };
        };
      };
    }
  };

  public shared ({ caller }) func sell(token_amount : Nat) : async Result.Result<Nat, Text> {
    if (Principal.isAnonymous(caller)) {
      return #err("Anonymous caller not allowed");
    };

    if (token_amount == 0) return #err("Zero amount");
    
    if (not vault_registered) {
      return #err("Vault not registered");
    };
    
    // Check user token balance
    let current_balance = Option.get(balances.get(caller), 0);
    if (current_balance < token_amount) {
      return #err("Insufficient token balance");
    };
    
    // Calculate base return
    let calculate_result = calculate_sell_return(token_amount);
    let base_amount = switch (calculate_result) {
      case (#err(msg)) return #err(msg);
      case (#ok(amt)) amt;
    };
    
    // Check vault has sufficient balance
    let vault : VaultInterface = actor(Principal.toText(init_params.vault_canister));
    let vault_balance = switch (await vault.getBalance(init_params.curve_id)) {
      case (#err(msg)) { return #err("Failed to check vault balance: " # msg) };
      case (#ok(bal)) { bal };
    };
    
    if (vault_balance < base_amount) {
      return #err("Insufficient liquidity in vault");
    };
    
    // Burn user tokens
    let token_ledger : TokenLedger = actor(Principal.toText(init_params.token_canister));
    
    let burn_args : TransferArgs = {
      from_subaccount = null;
      to = { owner = Principal.fromActor(this); subaccount = null }; // Burn to contract
      amount = token_amount;
      fee = ?0;
      memo = ?Blob.toArray(Text.encodeUtf8("BC sell burn"));
      created_at_time = ?Nat64.fromNat(Int.abs(Time.now()));
    };
    
    // Note: User must have transferred tokens to contract first or we need transfer_from
    // For simplicity, assuming internal balance tracking
    
    // Update internal balance
    balances.put(caller, current_balance - token_amount);
    tokens_minted -= token_amount;
    
    // Pay base currency to user from vault
    switch (await vault.payFunds(init_params.curve_id, caller, base_amount)) {
      case (#err(msg)) {
        // Rollback
        balances.put(caller, current_balance);
        tokens_minted += token_amount;
        return #err("Failed to pay funds: " # msg);
      };
      case (#ok(_)) {
        let fee = (base_amount * init_params.fee_percent) / 10000;
        protocol_fees += fee;
        total_base_raised -= base_amount;
        
        record_trade(caller, token_amount, base_amount, #sell);
        
        #ok(base_amount);
      };
    };
  };

  // ===== QUERY INTERFACE =====
  
  public query func get_current_price() : async Float {
    calculate_price();
  };

  public query func get_user_balance(user : Principal) : async Nat {
    Option.get(balances.get(user), 0);
  };

  public query func get_curve_stats() : async CurveStats {
    let current_price = calculate_price();
    let market_cap = current_price * Float.fromInt(tokens_minted);
    let progress = Float.fromInt(tokens_minted) / Float.fromInt(graduation_threshold);
    
    {
      tokens_minted = tokens_minted;
      total_base_raised = total_base_raised;
      current_price = current_price;
      market_cap = market_cap;
      progress_to_graduation = Float.min(progress, 1.0);
      is_graduated = is_graduated;
      base_pair = init_params.base_pair;
      max_supply = max_supply;
      graduation_threshold = graduation_threshold;
    }
  };

  public query func get_buy_quote(base_amount : Nat) : async Result.Result<{
    tokens_out : Nat;
    price : Float;
    fee : Nat;
    price_after : Float;
  }, Text> {
    let result = calculate_buy_return(base_amount);
    switch (result) {
      case (#err(msg)) #err(msg);
      case (#ok(tokens)) {
        let current_price = calculate_price();
        let fee = (base_amount * init_params.fee_percent) / 10000;
        
        // Simulate price after purchase
        let temp_minted = tokens_minted + tokens;
        let temp_current = Float.fromInt(temp_minted);
        let max_curve = Float.fromInt(graduation_threshold);
        let t = temp_current / max_curve;
        let p0 = Float.fromInt(init_params.initial_price);
        let p1 = Float.fromInt(init_params.price_at_80_percent);
        
        let price_after = switch (init_params.curve_type) {
          case (#linear) p0 + (p1 - p0) * t;
          case (#quadratic) p0 + (p1 - p0) * t * t;
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
        
        #ok({
          tokens_out = tokens;
          price = current_price;
          fee = fee;
          price_after = price_after;
        });
      };
    };
  };

  public query func get_sell_quote(token_amount : Nat) : async Result.Result<{
    base_out : Nat;
    price : Float;
    fee : Nat;
  }, Text> {
    let result = calculate_sell_return(token_amount);
    switch (result) {
      case (#err(msg)) #err(msg);
      case (#ok(base)) {
        let current_price = calculate_price();
        let gross = fromFloat(toFloat(token_amount) * current_price);
        let fee = (gross * init_params.fee_percent) / 10000;
        
        #ok({
          base_out = base;
          price = current_price;
          fee = fee;
        });
      };
    };
  };

  public query func get_recent_trades() : async [TradeInfo] {
    let trades = Array.tabulate<TradeInfo>(
      min(100, trade_count), 
      func(i) = recent_trades[(trade_index + 100 - min(100, trade_count) + i) % 100]
    );
    trades;
  };
  
  public query func get_init_params() : async {
    curve_id : Nat;
    curve_type : { #quadratic; #logarithmic; #linear; #exponential };
    base_pair : BasePair;
    token_canister : Principal;
    initial_price : Nat;
    price_at_80_percent : Nat;
    fee_percent : Nat;
    min_trade_amount : Nat;
    vault_canister : Principal;
    max_supply : Nat;
    graduation_threshold : Nat;
  } {
    {
      curve_id = init_params.curve_id;
      curve_type = init_params.curve_type;
      base_pair = init_params.base_pair;
      token_canister = init_params.token_canister;
      initial_price = init_params.initial_price;
      price_at_80_percent = init_params.price_at_80_percent;
      fee_percent = init_params.fee_percent;
      min_trade_amount = init_params.min_trade_amount;
      vault_canister = init_params.vault_canister;
      max_supply = max_supply;
      graduation_threshold = graduation_threshold;
    }
  };

  // ===== ADMIN FUNCTIONS =====
  
  public shared ({ caller }) func withdraw_fees() : async Result.Result<Nat, Text> {
    if (caller != owner) return #err("Not authorized");
    
    if (protocol_fees == 0) return #err("No fees to withdraw");
    
    let vault : VaultInterface = actor(Principal.toText(init_params.vault_canister));
    
    switch (await vault.payFunds(init_params.curve_id, owner, protocol_fees)) {
      case (#err(msg)) { #err("Failed to withdraw fees: " # msg) };
      case (#ok(_)) {
        let fees = protocol_fees;
        protocol_fees := 0;
        #ok(fees);
      };
    };
  };

  // ===== UPGRADE HOOKS =====
  
  system func preupgrade() {
    stable_balances := Iter.toArray(balances.entries());
    stable_tokens_minted := tokens_minted;
    stable_total_base_raised := total_base_raised;
    stable_protocol_fees := protocol_fees;
    stable_is_graduated := is_graduated;
    stable_trade_count := trade_count;
    stable_vault_registered := vault_registered;
  };

  system func postupgrade() {
    balances := TrieMap.fromEntries<Principal, Nat>(
      stable_balances.vals(),
      Principal.equal,
      Principal.hash
    );
    tokens_minted := stable_tokens_minted;
    total_base_raised := stable_total_base_raised;
    protocol_fees := stable_protocol_fees;
    is_graduated := stable_is_graduated;
    trade_count := stable_trade_count;
    vault_registered := stable_vault_registered;
    stable_balances := [];
  };
}