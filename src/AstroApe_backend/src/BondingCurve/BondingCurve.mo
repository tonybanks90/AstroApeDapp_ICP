import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Debug "mo:base/Debug";
import Error "mo:base/Error";
import Float "mo:base/Float";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Option "mo:base/Option";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Time "mo:base/Time";
import TrieMap "mo:base/TrieMap";
import Int "mo:base/Int";
import ICRC "./icrc";

shared ({ caller = owner }) actor class BondingCurveICRC2(
  init_params : {
    curve_type : { #quadratic; #logarithmic; #linear; #exponential };
    ckbtc_canister : Principal;
    token_canister : Principal;
    max_supply : Nat;
    initial_price : Nat; // Price in ckBTC satoshis (1 ckBTC = 100,000,000 satoshis)
    price_at_80_percent : Nat;
    fee_percent : Nat; // Basis points (1% = 100)
    min_trade_amount : Nat;
    graduation_threshold : Nat; // 80% of max supply
  }
) = this {
  
  // ========== TYPES ==========
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
    total_ckbtc_raised : Nat;
    current_price : Float;
    market_cap : Float;
    progress_to_graduation : Float;
    is_graduated : Bool;
  };

  // ========== STATE ==========
  private var tokens_minted : Nat = 0;
  private var total_ckbtc_raised : Nat = 0;
  private var protocol_fees : Nat = 0;
  private var is_graduated : Bool = false;
  private var trade_count : Nat = 0;
  
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
  private stable var stable_total_ckbtc_raised : Nat = 0;
  private stable var stable_protocol_fees : Nat = 0;
  private stable var stable_is_graduated : Bool = false;
  private stable var stable_trade_count : Nat = 0;

  // ========== MATH UTILS ==========
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

  // ========== BONDING CURVE CALCULATIONS ==========
  private func calculate_price() : Float {
    if (is_graduated) {
      return Float.fromInt(init_params.price_at_80_percent);
    };

    let graduation_supply = init_params.graduation_threshold;
    let current = Float.fromInt(tokens_minted);
    let max_curve = Float.fromInt(
      if (graduation_supply == 0) 1 else graduation_supply
    );

    if (tokens_minted >= graduation_supply) {
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

  private func calculate_buy_return(ckbtc_amount : Nat) : Result.Result<Nat, Text> {
    if (ckbtc_amount < init_params.min_trade_amount) {
      return #err("Amount below minimum trade size");
    };
    
    if (is_graduated) {
      return #err("Token has graduated - trading on DEX");
    };

    let current_price = calculate_price();
    let fee = (ckbtc_amount * init_params.fee_percent) / 10000;
    if (ckbtc_amount <= fee) return #err("Amount too small after fees");
    let amount_after_fee = ckbtc_amount - fee;
    
    if (amount_after_fee == 0) return #err("Amount too small after fees");
    
    let float_amount = Float.fromInt(amount_after_fee);
    let tokens = float_amount / current_price;
    let tokens_int = Float.toInt(Float.floor(tokens));
    let tokens_nat = safeIntToNat(tokens_int);
    
    if (tokens_minted + tokens_nat > init_params.max_supply) {
      let remaining = init_params.max_supply - tokens_minted;
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
    let float_value = Float.fromInt(token_amount) * current_price;
    let ckbtc_int = Float.toInt(Float.floor(float_value));
    let ckbtc_before_fee = safeIntToNat(ckbtc_int);
    
    if (ckbtc_before_fee == 0) return #err("Amount too small");
    
    let fee = (ckbtc_before_fee * init_params.fee_percent) / 10000;
    if (ckbtc_before_fee <= fee) return #err("Amount too small after fees");
    let ckbtc_amount = ckbtc_before_fee - fee;
    
    if (ckbtc_amount == 0) {
      #err("Amount too small after fees")
    } else {
      #ok(ckbtc_amount)
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
    if (tokens_minted >= init_params.graduation_threshold and not is_graduated) {
      is_graduated := true;
      // Here you could trigger liquidity provision to a DEX
      true;
    } else {
      false;
    }
  };

  // ========== CORE FUNCTIONS ==========
  public shared ({ caller }) func buy(ckbtc_amount : Nat) : async Result.Result<Nat, Text> {
    if (Principal.isAnonymous(caller)) {
      return #err("Anonymous caller not allowed");
    };

    let ckbtc : ICRC.Actor = actor(Principal.toText(init_params.ckbtc_canister));
    
    // Calculate tokens to mint
    let calculate_result = calculate_buy_return(ckbtc_amount);
    let tokens = switch (calculate_result) {
      case (#err(msg)) return #err(msg);
      case (#ok(t)) t;
    };
    
    // Check user's ckBTC allowance
    let allowance = await ckbtc.icrc2_allowance({
      account = { owner = caller; subaccount = null };
      spender = { owner = Principal.fromActor(this); subaccount = null };
    });
    
    if (allowance.allowance < ckbtc_amount) {
      return #err("Insufficient allowance. Please approve the contract first.");
    };
    
    // Transfer ckBTC from user to contract
    let transfer_result = await ckbtc.icrc2_transfer_from({
      spender_subaccount = null;
      from = { owner = caller; subaccount = null };
      to = { owner = Principal.fromActor(this); subaccount = null };
      amount = ckbtc_amount;
      fee = null;
      memo = null;
      created_at_time = null;
    });
    
    switch (transfer_result) {
      case (#Err(e)) return #err("Transfer failed: " # debug_show(e));
      case (#Ok(_)) {
        // Mint tokens to user
        let current_balance = Option.get(balances.get(caller), 0);
        balances.put(caller, current_balance + tokens);
        tokens_minted += tokens;
        total_ckbtc_raised += ckbtc_amount;
        
        let fee = (ckbtc_amount * init_params.fee_percent) / 10000;
        protocol_fees += fee;
        
        record_trade(caller, ckbtc_amount, tokens, #buy);
        
        // Check if token should graduate
        let graduated = check_graduation();
        
        #ok(tokens);
      };
    };
  };

  public shared ({ caller }) func sell(token_amount : Nat) : async Result.Result<Nat, Text> {
    if (Principal.isAnonymous(caller)) {
      return #err("Anonymous caller not allowed");
    };

    if (token_amount == 0) return #err("Zero amount");
    
    let ckbtc : ICRC.Actor = actor(Principal.toText(init_params.ckbtc_canister));
    
    // Check user token balance
    let current_balance = Option.get(balances.get(caller), 0);
    if (current_balance < token_amount) {
      return #err("Insufficient token balance");
    };
    
    // Calculate ckBTC return
    let calculate_result = calculate_sell_return(token_amount);
    let ckbtc_amount = switch (calculate_result) {
      case (#err(msg)) return #err(msg);
      case (#ok(amt)) amt;
    };
    
    // Check contract ckBTC balance
    let contract_balance = await ckbtc.icrc1_balance_of({
      owner = Principal.fromActor(this);
      subaccount = null;
    });
    
    if (contract_balance < ckbtc_amount) {
      return #err("Insufficient liquidity in contract");
    };
    
    // Burn user tokens
    balances.put(caller, current_balance - token_amount);
    tokens_minted -= token_amount;
    
    // Transfer ckBTC to user
    let transfer_result = await ckbtc.icrc1_transfer({
      from_subaccount = null;
      to = { owner = caller; subaccount = null };
      amount = ckbtc_amount;
      fee = null;
      memo = null;
      created_at_time = null;
    });
    
    switch (transfer_result) {
      case (#Err(e)) {
        // Revert token burn on transfer failure
        balances.put(caller, current_balance);
        tokens_minted += token_amount;
        return #err("Transfer failed: " # debug_show(e));
      };
      case (#Ok(_)) {
        let fee = (ckbtc_amount * init_params.fee_percent) / 10000;
        protocol_fees += fee;
        total_ckbtc_raised -= ckbtc_amount;
        
        record_trade(caller, token_amount, ckbtc_amount, #sell);
        
        #ok(ckbtc_amount);
      };
    };
  };

  // ========== QUERY INTERFACE ==========
  public query func get_current_price() : async Float {
    calculate_price();
  };

  public query func get_user_balance(user : Principal) : async Nat {
    Option.get(balances.get(user), 0);
  };

  public query func get_curve_stats() : async CurveStats {
    let current_price = calculate_price();
    let market_cap = current_price * Float.fromInt(tokens_minted);
    let progress = Float.fromInt(tokens_minted) / Float.fromInt(init_params.graduation_threshold);
    
    {
      tokens_minted = tokens_minted;
      total_ckbtc_raised = total_ckbtc_raised;
      current_price = current_price;
      market_cap = market_cap;
      progress_to_graduation = Float.min(progress, 1.0);
      is_graduated = is_graduated;
    }
  };

  public query func get_buy_quote(ckbtc_amount : Nat) : async Result.Result<{
    tokens_out : Nat;
    price : Float;
    fee : Nat;
    price_after : Float;
  }, Text> {
    let result = calculate_buy_return(ckbtc_amount);
    switch (result) {
      case (#err(msg)) #err(msg);
      case (#ok(tokens)) {
        let current_price = calculate_price();
        let fee = (ckbtc_amount * init_params.fee_percent) / 10000;
        
        // Simulate price after purchase
        let temp_minted = tokens_minted + tokens;
        let temp_current = Float.fromInt(temp_minted);
        let max_curve = Float.fromInt(init_params.graduation_threshold);
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
    ckbtc_out : Nat;
    price : Float;
    fee : Nat;
  }, Text> {
    let result = calculate_sell_return(token_amount);
    switch (result) {
      case (#err(msg)) #err(msg);
      case (#ok(ckbtc)) {
        let current_price = calculate_price();
        let gross = Float.toInt(Float.fromInt(token_amount) * current_price);
        let fee = (safeIntToNat(gross) * init_params.fee_percent) / 10000;
        
        #ok({
          ckbtc_out = ckbtc;
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

  // ========== USER UTILITY FUNCTIONS ==========
  
  // Allow users to approve unlimited spending (max Nat value)
  public shared ({ caller }) func approve_unlimited() : async Result.Result<Text, Text> {
    if (Principal.isAnonymous(caller)) {
      return #err("Anonymous caller not allowed");
    };

    let ckbtc : ICRC.Actor = actor(Principal.toText(init_params.ckbtc_canister));
    
    // Use max Nat value for unlimited approval
    let max_amount : Nat = 18446744073709551615; // 2^64 - 1
    
    let approve_result = await ckbtc.icrc2_approve({
      from_subaccount = null;
      spender = { owner = Principal.fromActor(this); subaccount = null };
      amount = max_amount;
      expected_allowance = null;
      expires_at = null;
      fee = null;
      memo = null;
      created_at_time = null;
    });
    
    switch (approve_result) {
      case (#Err(e)) #err("Approval failed: " # debug_show(e));
      case (#Ok(_)) #ok("Unlimited spending approved successfully");
    };
  };

  // Allow users to approve a specific amount
  public shared ({ caller }) func approve_amount(amount : Nat) : async Result.Result<Text, Text> {
    if (Principal.isAnonymous(caller)) {
      return #err("Anonymous caller not allowed");
    };

    let ckbtc : ICRC.Actor = actor(Principal.toText(init_params.ckbtc_canister));
    
    let approve_result = await ckbtc.icrc2_approve({
      from_subaccount = null;
      spender = { owner = Principal.fromActor(this); subaccount = null };
      amount = amount;
      expected_allowance = null;
      expires_at = null;
      fee = null;
      memo = null;
      created_at_time = null;
    });
    
    switch (approve_result) {
      case (#Err(e)) #err("Approval failed: " # debug_show(e));
      case (#Ok(_)) #ok("Amount approved successfully");
    };
  };

  // Check user's ckBTC balance
  public shared ({ caller }) func get_my_ckbtc_balance() : async Nat {
    let ckbtc : ICRC.Actor = actor(Principal.toText(init_params.ckbtc_canister));
    
    await ckbtc.icrc1_balance_of({
      owner = caller;
      subaccount = null;
    });
  };

  // Check any user's ckBTC balance (public)
  public shared func get_ckbtc_balance(user : Principal) : async Nat {
    let ckbtc : ICRC.Actor = actor(Principal.toText(init_params.ckbtc_canister));
    
    await ckbtc.icrc1_balance_of({
      owner = user;
      subaccount = null;
    });
  };

  // Check current allowance for the caller
  public shared ({ caller }) func get_my_allowance() : async Nat {
    let ckbtc : ICRC.Actor = actor(Principal.toText(init_params.ckbtc_canister));
    
    let allowance_result = await ckbtc.icrc2_allowance({
      account = { owner = caller; subaccount = null };
      spender = { owner = Principal.fromActor(this); subaccount = null };
    });
    
    allowance_result.allowance;
  };

  // Get user's token balance (same as get_user_balance but for convenience)
  public query ({ caller }) func get_my_token_balance() : async Nat {
    Option.get(balances.get(caller), 0);
  };

  // Check if user needs to approve more spending
  public shared ({ caller }) func check_approval_needed(trade_amount : Nat) : async {
    current_allowance : Nat;
    needs_approval : Bool;
    suggested_approval : Nat;
  } {
    let ckbtc : ICRC.Actor = actor(Principal.toText(init_params.ckbtc_canister));
    
    let allowance_result = await ckbtc.icrc2_allowance({
      account = { owner = caller; subaccount = null };
      spender = { owner = Principal.fromActor(this); subaccount = null };
    });
    
    let current_allowance = allowance_result.allowance;
    let needs_approval = current_allowance < trade_amount;
    
    // Suggest approving 10x the trade amount or unlimited
    let suggested_approval = if (needs_approval) {
      max(trade_amount * 10, 100000000) // At least 1 ckBTC worth
    } else {
      0
    };
    
    {
      current_allowance = current_allowance;
      needs_approval = needs_approval;
      suggested_approval = suggested_approval;
    };
  };

  // ========== ADMIN FUNCTIONS ==========
  public shared ({ caller }) func withdraw_fees() : async Result.Result<Nat, Text> {
    if (caller != owner) return #err("Not authorized");
    
    if (protocol_fees == 0) return #err("No fees to withdraw");
    
    let ckbtc : ICRC.Actor = actor(Principal.toText(init_params.ckbtc_canister));
    
    let transfer_result = await ckbtc.icrc1_transfer({
      from_subaccount = null;
      to = { owner = owner; subaccount = null };
      amount = protocol_fees;
      fee = null;
      memo = null;
      created_at_time = null;
    });
    
    switch (transfer_result) {
      case (#Err(e)) #err("Transfer failed: " # debug_show(e));
      case (#Ok(_)) {
        let fees = protocol_fees;
        protocol_fees := 0;
        #ok(fees);
      };
    };
  };

  public query ({ caller }) func get_init_params() : async {
    curve_type : { #quadratic; #logarithmic; #linear; #exponential };
    ckbtc_canister : Principal;
    token_canister : Principal;
    max_supply : Nat;
    initial_price : Nat;
    price_at_80_percent : Nat;
    fee_percent : Nat;
    min_trade_amount : Nat;
    graduation_threshold : Nat;
  } {
    if (caller != owner) {
      Debug.trap("Not authorized");
    };
    init_params;
  };

  // ========== UPGRADE HOOKS ==========
  system func preupgrade() {
    stable_balances := Iter.toArray(balances.entries());
    stable_tokens_minted := tokens_minted;
    stable_total_ckbtc_raised := total_ckbtc_raised;
    stable_protocol_fees := protocol_fees;
    stable_is_graduated := is_graduated;
    stable_trade_count := trade_count;
  };

  system func postupgrade() {
    balances := TrieMap.fromEntries<Principal, Nat>(
      stable_balances.vals(),
      Principal.equal,
      Principal.hash
    );
    tokens_minted := stable_tokens_minted;
    total_ckbtc_raised := stable_total_ckbtc_raised;
    protocol_fees := stable_protocol_fees;
    is_graduated := stable_is_graduated;
    trade_count := stable_trade_count;
    stable_balances := [];
  };
};