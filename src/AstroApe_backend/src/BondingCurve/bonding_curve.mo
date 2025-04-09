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

shared ({ caller = owner }) actor class BondingCurve(
  init_params : {
    curve_type : { #quadratic; #logarithmic };
    token_canister : Principal;
    max_supply : Nat;
    initial_price : Nat;
    price_at_80_percent : Nat;
    fee_percent : Nat;
  }
) = this {
  // ========== STATE ==========
  private var tokens_minted : Nat = 0;
  private var protocol_fees : Nat = 0;
  
  private var balances = TrieMap.TrieMap<Principal, Nat>(
    Principal.equal, 
    Principal.hash
  );
  
  private stable var stable_balances : [(Principal, Nat)] = [];
  private stable var stable_tokens_minted : Nat = 0;
  private stable var stable_protocol_fees : Nat = 0;

  // ========== MATH UTILS ==========
  private func pow(n : Nat, exp : Nat) : Nat {
    var result = 1;
    var count = exp;
    while (count > 0) {
      result *= n;
      count -= 1;
    };
    result;
  };

 // Add safe conversion function at the top of the actor
private func safeIntToNat(i : Int) : Nat {
  if (i >= 0) {
    Int.abs(i);
  } else {
    0;
  }
};


  // ========== BONDING CURVE CALCULATIONS ==========
  // Add safety checks in price calculation
private func calculate_price() : Float {
    let max_curve_supply = 
      if (init_params.max_supply == 0) 1 
      else (init_params.max_supply * 80) / 100;
      
    let current = Float.fromInt(tokens_minted);
    let max_curve = Float.fromInt(
      if (max_curve_supply == 0) 1 else max_curve_supply
    );

    if (tokens_minted >= max_curve_supply) {
      return Float.fromInt(init_params.price_at_80_percent);
    };

    let p0 = Float.fromInt(init_params.initial_price);
    let p1 = Float.fromInt(init_params.price_at_80_percent);
    
    switch (init_params.curve_type) {
      case (#quadratic) {
        let t = current / max_curve;
        p0 + (p1 - p0) * t * t;
      };
      case (#logarithmic) {
  let t = current / (if (max_curve == 0.0) 1.0 else max_curve);
  p0 + (p1 - p0) * Float.log(1.0 + t) / (if (Float.log(2.0) == 0.0) 1.0 else Float.log(2.0));
};
    }
};

  // Update the calculate_buy_return function
private func calculate_buy_return(cketh_amount : Nat) : Result.Result<Nat, Text> {
    let current_price = calculate_price();
    let fee = (cketh_amount * init_params.fee_percent) / 10000;
    let amount_after_fee = cketh_amount - fee;
    
    if (amount_after_fee == 0) return #err("Amount too small after fees");
    
    let float_amount = Float.fromInt(amount_after_fee);
    let tokens = float_amount / current_price;
    let tokens_int = Float.toInt(Float.floor(tokens));
let tokens_nat = safeIntToNat(tokens_int);
    
    if (tokens_minted + tokens_nat > init_params.max_supply) {
      #err("Insufficient token supply")
    } else {
      #ok(tokens_nat)
    }
};

private func calculate_sell_return(token_amount : Nat) : Result.Result<Nat, Text> {
    if (token_amount == 0) return #err("Zero amount");
    
    let current_price = calculate_price();
    let float_value = Float.fromInt(token_amount) * current_price;
    let cketh_int = Float.toInt(Float.floor(float_value));
let cketh_before_fee = safeIntToNat(cketh_int);
    
    if (cketh_before_fee == 0) return #err("Amount too small");
    
    let fee = (cketh_before_fee * init_params.fee_percent) / 10000;
    let cketh_amount = cketh_before_fee - fee;
    
    if (cketh_amount <= 0) {
      #err("Amount too small after fees")
    } else {
      #ok(cketh_amount)
    }
};

  // ========== CORE FUNCTIONS ==========
  public shared ({ caller }) func buy() : async Result.Result<Nat, Text> {
    let cketh : ICRC.Actor = actor(Principal.toText(init_params.token_canister));
    
    // Get user's ckETH balance
    let balance = await cketh.icrc1_balance_of({
      owner = caller; 
      subaccount = null
    });
    
    // Calculate max purchasable
    let calculate_result = calculate_buy_return(balance);
    let tokens = switch (calculate_result) {
      case (#err(msg)) return #err(msg);
      case (#ok(t)) t;
    };
    
    // Transfer ckETH to contract
    let transfer_result = await cketh.icrc1_transfer({
      from_subaccount = null;
      to = { owner = Principal.fromActor(this); subaccount = null };
      amount = balance;
      fee = null;
      memo = null;
      created_at_time = null;
    });
    
    switch (transfer_result) {
      case (#Err(e)) #err("Transfer failed: " # debug_show(e));
      case (#Ok(_)) {
        // Mint tokens
        let current_balance = Option.get(balances.get(caller), 0);
        balances.put(caller, current_balance + tokens);
        tokens_minted += tokens;
        protocol_fees += (balance * init_params.fee_percent) / 10000;
        #ok(tokens)
      };
    };
  };

  public shared ({ caller }) func sell(amount : Nat) : async Result.Result<Nat, Text> {
    if (amount == 0) return #err("Zero amount");
    
    let cketh : ICRC.Actor = actor(Principal.toText(init_params.token_canister));
    
    // Check user balance
    let current_balance = Option.get(balances.get(caller), 0);
    if (current_balance < amount) {
      return #err("Insufficient token balance");
    };
    
    // Calculate ckETH return
    let calculate_result = calculate_sell_return(amount);
    let cketh_amount = switch (calculate_result) {
      case (#err(msg)) return #err(msg);
      case (#ok(amt)) amt;
    };
    
    // Check contract ckETH balance
    let contract_balance = await cketh.icrc1_balance_of({
      owner = Principal.fromActor(this);
      subaccount = null;
    });
    
    if (contract_balance < cketh_amount) {
      return #err("Insufficient liquidity");
    };
    
    // Burn tokens
    balances.put(caller, current_balance - amount);
    tokens_minted -= amount;
    
    // Transfer ckETH to user
    let transfer_result = await cketh.icrc1_transfer({
      from_subaccount = null;
      to = { owner = caller; subaccount = null };
      amount = cketh_amount;
      fee = null;
      memo = null;
      created_at_time = null;
    });
    
    switch (transfer_result) {
      case (#Err(e)) #err("Transfer failed: " # debug_show(e));
      case (#Ok(_)) {
        protocol_fees += (cketh_amount * init_params.fee_percent) / 10000;
        #ok(cketh_amount)
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

  public query func get_system_stats() : async {
    tokens_minted : Nat;
    max_supply : Nat;
    protocol_fees : Nat;
  } {
    {
      tokens_minted = tokens_minted;
      max_supply = init_params.max_supply;
      protocol_fees = protocol_fees;
    }
  };

  // ========== UPGRADE HOOKS ==========
  system func preupgrade() {
    stable_balances := Iter.toArray(balances.entries());
    stable_tokens_minted := tokens_minted;
    stable_protocol_fees := protocol_fees;
  };

  system func postupgrade() {
    balances := TrieMap.fromEntries<Principal, Nat>(
      stable_balances.vals(),
      Principal.equal,
      Principal.hash
    );
    tokens_minted := stable_tokens_minted;
    protocol_fees := stable_protocol_fees;
    stable_balances := [];
  };
};