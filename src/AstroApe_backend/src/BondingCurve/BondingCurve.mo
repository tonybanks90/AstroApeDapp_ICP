import Array "mo:base/Array";
import Text "mo:base/Text";
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
import HashMap "mo:base/HashMap";
import Int "mo:base/Int";

persistent actor BondingCurve {

  // ===== TYPES =====

  public type BasePair = {
    #ckBTC; // 8 decimals, satoshis
    #ckETH; // 18 decimals, wei
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

  public type InitParams = {
    curve_id : Nat;
    curve_type : { #quadratic; #logarithmic; #linear; #exponential };
    base_pair : BasePair;
    token_canister : Principal;
    initial_price : Nat;
    price_at_80_percent : Nat;
    fee_percent : Nat;
    min_trade_amount : Nat;
    vault_canister : Principal;
  };

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

  public type TokenLedger = actor {
    icrc1_transfer : (TransferArgs) -> async (TransferResult);
    icrc1_balance_of : (Account) -> async (Nat);
    icrc2_transfer_from : ({
      from : Account;
      to : Account;
      amount : Nat;
      fee : ?Nat;
      spender_subaccount : ?[Nat8];
      memo : ?[Nat8];
      created_at_time : ?Nat64;
    }) -> async (TransferResult);
  };

  public type VaultInterface = actor {
    registerCurve : (Nat, BasePair) -> async (Result.Result<[Nat8], Text>);
    pullFunds : (Nat, Principal, Nat) -> async (Result.Result<Nat, Text>);
    payFunds : (Nat, Principal, Nat) -> async (Result.Result<Nat, Text>);
    getBalance : (Nat) -> async (Result.Result<Nat, Text>);
  };

  // ===== CONSTANTS =====

  private transient let BITCOIN_SUPPLY : Nat = 21_000_000;
  private transient let ETHEREUM_SUPPLY : Nat = 1_000_000_000;
  private transient let SATOSHI_DECIMALS : Nat8 = 8;
  private transient let WEI_DECIMALS : Nat8 = 18;

  // ===== STATE CLASS =====
  // Nested class for state management

  class CurveState(params : InitParams) {
    public let init_params = params;

    public var tokens_minted : Nat = 0;
    public var total_base_raised : Nat = 0;
    public var protocol_fees : Nat = 0;
    public var is_graduated : Bool = false;
    public var trade_count : Nat = 0;
    public var vault_registered : Bool = false;

    // Derived
    public let max_supply : Nat = switch (params.base_pair) {
      case (#ckBTC) { BITCOIN_SUPPLY * (10 ** Nat8.toNat(SATOSHI_DECIMALS)) };
      case (#ckETH) { ETHEREUM_SUPPLY * (10 ** Nat8.toNat(WEI_DECIMALS)) };
    };
    public let graduation_threshold : Nat = (max_supply * 80) / 100;

    public var balances = TrieMap.TrieMap<Principal, Nat>(Principal.equal, Principal.hash);

    public var recent_trades : [var TradeInfo] = Array.init<TradeInfo>(
      100,
      {
        user = params.token_canister; // dummy
        amount_in = 0;
        amount_out = 0;
        price = 0.0;
        timestamp = 0;
        trade_type = #buy;
      },
    );
    public var trade_index : Nat = 0;

    public func record_trade(user : Principal, amount_in : Nat, amount_out : Nat, trade_type : { #buy; #sell }, price : Float) {
      let trade : TradeInfo = {
        user = user;
        amount_in = amount_in;
        amount_out = amount_out;
        price = price;
        timestamp = Time.now();
        trade_type = trade_type;
      };
      recent_trades[trade_index] := trade;
      trade_index := (trade_index + 1) % 100;
      trade_count += 1;
    };
  };

  // MAIN STATE STORE
  // Map TokenPrincipal -> CurveState
  private transient var curves = HashMap.HashMap<Principal, CurveState>(10, Principal.equal, Principal.hash);
  private transient var owner : Principal = Principal.fromText("2vxsx-fae"); // Dummy

  // ===== MANAGEMENT =====

  public shared ({ caller }) func add_curve(params : InitParams) : async Result.Result<Text, Text> {
    if (Option.isSome(curves.get(params.token_canister))) {
      return #err("Curve already exists for this token");
    };

    let newState = CurveState(params);
    curves.put(params.token_canister, newState);

    // Register with Vault immediately
    let vault : VaultInterface = actor (Principal.toText(params.vault_canister));
    switch (await vault.registerCurve(params.curve_id, params.base_pair)) {
      case (#err(msg)) {
        if (msg == "Curve already registered") {
          newState.vault_registered := true;
          return #ok("Recovered registration");
        } else {
          return #err("Vault registration failed: " # msg);
        };
      };
      case (#ok(subaccount)) {
        newState.vault_registered := true;
        return #ok("Curve initialized and registered with Vault");
      };
    };
  };

  // ===== HELPER: Get State =====
  private func get_curve(tokenId : Principal) : Result.Result<CurveState, Text> {
    switch (curves.get(tokenId)) {
      case (null) #err("Curve not found for token");
      case (?c) #ok(c);
    };
  };

  // ===== MATH & PRICING =====

  private func calculate_price(c : CurveState) : Float {
    if (c.is_graduated) {
      return Float.fromInt(c.init_params.price_at_80_percent);
    };

    let current = Float.fromInt(c.tokens_minted);
    let max_curve = Float.fromInt(c.graduation_threshold);

    if (c.tokens_minted >= c.graduation_threshold) {
      return Float.fromInt(c.init_params.price_at_80_percent);
    };

    let p0 = Float.fromInt(c.init_params.initial_price);
    let p1 = Float.fromInt(c.init_params.price_at_80_percent);
    let t = current / (if (max_curve == 0.0) 1.0 else max_curve);

    switch (c.init_params.curve_type) {
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
  };

  private func toFloat(amount : Nat) : Float { Float.fromInt(amount) };
  private func fromFloat(amount : Float) : Nat {
    let rounded = Float.toInt(Float.nearest(amount));
    if (rounded >= 0) Int.abs(rounded) else 0;
  };

  // ===== TRADING FUNCTIONS =====

  public shared ({ caller }) func buy(tokenId : Principal, base_amount : Nat) : async Result.Result<Nat, Text> {
    if (Principal.isAnonymous(caller)) return #err("Anonymous caller not allowed");

    let c = switch (get_curve(tokenId)) {
      case (#ok(v)) v;
      case (#err(e)) return #err(e);
    };

    if (not c.vault_registered) return #err("Vault not registered");

    // Calculation
    if (c.is_graduated) return #err("Token migrated to DEX");
    let current_price = calculate_price(c);
    let fee = (base_amount * c.init_params.fee_percent) / 10000;
    let net_amount = if (base_amount > fee) base_amount - fee else 0;

    if (net_amount < c.init_params.min_trade_amount) return #err("Amount too small");

    let tokens_out_float = toFloat(net_amount) / current_price;
    let tokens_out = fromFloat(tokens_out_float);

    if (c.tokens_minted + tokens_out > c.max_supply) {
      return #err("Max supply reached");
    };

    // ACTION: Pull Funds
    let vault : VaultInterface = actor (Principal.toText(c.init_params.vault_canister));
    switch (await vault.pullFunds(c.init_params.curve_id, caller, base_amount)) {
      case (#err(msg)) return #err("Vault pull failed: " # msg);
      case (#ok(_)) {
        // ACTION: Mint Tokens
        let token_ledger : TokenLedger = actor (Principal.toText(c.init_params.token_canister));
        let transfer_args : TransferArgs = {
          from_subaccount = null;
          to = { owner = caller; subaccount = null };
          amount = tokens_out;
          fee = null;
          memo = ?Blob.toArray(Text.encodeUtf8("BC buy"));
          created_at_time = ?Nat64.fromNat(Int.abs(Time.now()));
        };

        switch (await token_ledger.icrc1_transfer(transfer_args)) {
          case (#Err(e)) {
            // Refund
            ignore await vault.payFunds(c.init_params.curve_id, caller, base_amount);
            return #err("Mint failed");
          };
          case (#Ok(_)) {
            // Update State
            c.tokens_minted += tokens_out;
            c.total_base_raised += base_amount;
            c.protocol_fees += fee;
            let bal = Option.get(c.balances.get(caller), 0);
            c.balances.put(caller, bal + tokens_out);

            c.record_trade(caller, base_amount, tokens_out, #buy, current_price);

            if (c.tokens_minted >= c.graduation_threshold) {
              c.is_graduated := true;
            };

            return #ok(tokens_out);
          };
        };
      };
    };
  };

  public shared ({ caller }) func sell(tokenId : Principal, token_amount : Nat) : async Result.Result<Nat, Text> {
    if (Principal.isAnonymous(caller)) return #err("Anonymous caller not allowed");
    if (token_amount == 0) return #err("Zero amount");

    let c = switch (get_curve(tokenId)) {
      case (#ok(v)) v;
      case (#err(e)) return #err(e);
    };

    let bal = Option.get(c.balances.get(caller), 0);
    if (bal < token_amount) return #err("Insufficient curve balance (sell only what you bought)");

    let current_price = calculate_price(c);
    let gross_base = fromFloat(toFloat(token_amount) * current_price);
    let fee = (gross_base * c.init_params.fee_percent) / 10000;
    let net_base = if (gross_base > fee) gross_base - fee else 0;

    if (net_base == 0) return #err("Value too low");

    // Check Vault Liquidity
    let vault : VaultInterface = actor (Principal.toText(c.init_params.vault_canister));
    let vault_bal = switch (await vault.getBalance(c.init_params.curve_id)) {
      case (#ok(b)) b;
      case (#err(e)) return #err("Vault balance check failed: " # e);
    };
    if (vault_bal < net_base) return #err("Insufficient vault liquidity");

    c.balances.put(caller, bal - token_amount);
    c.tokens_minted -= token_amount;

    // Pay User
    switch (await vault.payFunds(c.init_params.curve_id, caller, net_base)) {
      case (#err(msg)) {
        // Revert
        c.balances.put(caller, bal);
        c.tokens_minted += token_amount;
        return #err("Payment failed: " # msg);
      };
      case (#ok(_)) {
        c.total_base_raised -= net_base;
        c.protocol_fees += fee;
        c.record_trade(caller, token_amount, net_base, #sell, current_price);
        return #ok(net_base);
      };
    };
  };

  // ===== QUERIES =====

  public query func get_curve_stats(tokenId : Principal) : async Result.Result<CurveStats, Text> {
    switch (curves.get(tokenId)) {
      case (null) #err("Curve not found");
      case (?c) {
        let cp = calculate_price(c);
        let mc = cp * Float.fromInt(c.tokens_minted);
        let prog = Float.fromInt(c.tokens_minted) / Float.fromInt(c.graduation_threshold);

        #ok({
          tokens_minted = c.tokens_minted;
          total_base_raised = c.total_base_raised;
          current_price = cp;
          market_cap = mc;
          progress_to_graduation = Float.min(prog, 1.0);
          is_graduated = c.is_graduated;
          base_pair = c.init_params.base_pair;
          max_supply = c.max_supply;
          graduation_threshold = c.graduation_threshold;
        });
      };
    };
  };

  public query func get_recent_trades(tokenId : Principal) : async [TradeInfo] {
    switch (curves.get(tokenId)) {
      case (null) [];
      case (?c) {
        let count = c.trade_count;
        let cap = if (count < 100) count else 100;
        Array.tabulate<TradeInfo>(
          cap,
          func(i) {
            let idx = (c.trade_index + 100 - cap + i) % 100;
            c.recent_trades[idx];
          },
        );
      };
    };
  };

  public query func get_holders(tokenId : Principal) : async [(Principal, Nat)] {
    switch (curves.get(tokenId)) {
      case (null) [];
      case (?c) Iter.toArray(c.balances.entries());
    };
  };

  public shared ({ caller }) func withdraw_fees(tokenId : Principal) : async Result.Result<Nat, Text> {
    let c = switch (get_curve(tokenId)) {
      case (#ok(v)) v;
      case (#err(e)) return #err(e);
    };

    if (c.protocol_fees == 0) return #err("No fees to withdraw");

    let vault : VaultInterface = actor (Principal.toText(c.init_params.vault_canister));

    switch (await vault.payFunds(c.init_params.curve_id, caller, c.protocol_fees)) {
      case (#err(msg)) { #err("Failed to withdraw fees: " # msg) };
      case (#ok(_)) {
        let fees = c.protocol_fees;
        c.protocol_fees := 0;
        #ok(fees);
      };
    };
  };

};
