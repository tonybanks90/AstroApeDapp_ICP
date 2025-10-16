import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Float "mo:base/Float";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Time "mo:base/Time";
import Result "mo:base/Result";
import Int "mo:base/Int";

persistent actor KONGRouter {

  // ----------- TYPE DEFINITIONS -----------
  
  // KongSwap Types
  public type TxId = { #TransactionId : Text; #BlockIndex : Nat };
  
  public type SwapArgs = {
    receive_token : Text;
    max_slippage : ?Float;
    pay_amount : Nat;
    referred_by : ?Text;
    receive_amount : ?Nat;
    receive_address : ?Text;
    pay_token : Text;
    pay_tx_id : ?TxId;
  };
  
  public type SwapTxReply = {
    ts : Nat64;
    receive_chain : Text;
    pay_amount : Nat;
    receive_amount : Nat;
    pay_symbol : Text;
    receive_symbol : Text;
    receive_address : Text;
    pool_symbol : Text;
    pay_address : Text;
    price : Float;
    pay_chain : Text;
    lp_fee : Nat;
    gas_fee : Nat;
  };
  
  public type SwapAmountsReply = {
    txs : [SwapTxReply];
    receive_chain : Text;
    mid_price : Float;
    pay_amount : Nat;
    receive_amount : Nat;
    pay_symbol : Text;
    receive_symbol : Text;
    receive_address : Text;
    pay_address : Text;
    price : Float;
    pay_chain : Text;
    slippage : Float;
  };
  
  public type SwapAmountsResult = { #Ok : SwapAmountsReply; #Err : Text };
  
  public type SwapReply = {
    ts : Nat64;
    txs : [SwapTxReply];
    request_id : Nat64;
    status : Text;
    tx_id : Nat64;
    transfer_ids : [TransferIdReply];
    receive_chain : Text;
    mid_price : Float;
    pay_amount : Nat;
    receive_amount : Nat;
    claim_ids : [Nat64];
    pay_symbol : Text;
    receive_symbol : Text;
    receive_address : Text;
    pay_address : Text;
    price : Float;
    pay_chain : Text;
    slippage : Float;
  };
  
  public type TransferReply = { #IC : ICTransferReply };
  public type ICTransferReply = {
    is_send : Bool;
    block_index : Nat;
    chain : Text;
    canister_id : Text;
    amount : Nat;
    symbol : Text;
  };
  public type TransferIdReply = { transfer_id : Nat64; transfer : TransferReply };
  public type SwapResult = { #Ok : SwapReply; #Err : Text };

  // ICRC Token Types
  public type Subaccount = ?Blob;
  public type Account = { owner : Principal; subaccount : Subaccount };
  
  public type TransferArgs = {
    to : Account;
    fee : ?Nat;
    memo : ?Blob;
    from_subaccount : Subaccount;
    created_at_time : ?Nat64;
    amount : Nat;
  };
  
  public type TransferFromArgs = {
    spender_subaccount : Subaccount;
    from : Account;
    to : Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?Blob;
    created_at_time : ?Nat64;
  };
  
  public type ApproveArgs = {
    from_subaccount : Subaccount;
    spender : Account;
    amount : Nat;
    expected_allowance : ?Nat;
    expires_at : ?Nat64;
    fee : ?Nat;
    memo : ?Blob;
    created_at_time : ?Nat64;
  };
  
  public type TransferResult = { #Ok : Nat; #Err : {
    #BadFee : { expected_fee : Nat };
    #BadBurn : { min_burn_amount : Nat };
    #InsufficientFunds : { balance : Nat };
    #TooOld;
    #CreatedInFuture : { ledger_time : Nat64 };
    #TemporarilyUnavailable;
    #GenericError : { error_code : Nat; message : Text };
  }};
  
  public type ApproveResult = { #Ok : Nat; #Err : {
    #BadFee : { expected_fee : Nat };
    #InsufficientFunds : { balance : Nat };
    #AllowanceChanged : { current_allowance : Nat };
    #Expired : { ledger_time : Nat64 };
    #TooOld;
    #CreatedInFuture : { ledger_time : Nat64 };
    #Duplicate : { duplicate_of : Nat };
    #TemporarilyUnavailable;
    #GenericError : { error_code : Nat; message : Text };
  }};

  // Actor type definitions
  public type KongService = actor {
    swap_amounts : shared query (Text, Nat, Text) -> async SwapAmountsResult;
    swap : shared SwapArgs -> async SwapResult;
  };

  public type ICRC2 = actor {
    icrc1_transfer : shared TransferArgs -> async TransferResult;
    icrc1_decimals : shared query () -> async Nat8;
    icrc1_symbol : shared query () -> async Text;
    icrc1_balance_of : shared query Account -> async Nat;
    icrc2_approve : shared ApproveArgs -> async ApproveResult;
    icrc2_transfer_from : shared TransferFromArgs -> async TransferResult;
    icrc2_allowance : shared query { account : Account; spender : Account } -> async { allowance : Nat; expires_at : ?Nat64 };
  };

  // ----------- CONFIGURATION -----------
  
  // KongSwap backend canister (MAINNET)
  transient let kong : KongService = actor ("2ipq2-uqaaa-aaaar-qailq-cai");

  // Treasury that receives aggregator fees
  transient let treasury : Account = {
    owner = Principal.fromText("2vxsx-fae"); // Replace with your treasury principal
    subaccount = null;
  };

  // Fee configuration
  stable var fee_bps : Nat = 30; // 0.30%
  transient let max_fee_bps : Nat = 500; // 5% maximum

  // ----------- HELPER FUNCTIONS -----------
  
  func take_bps(amount : Nat, bps : Nat) : Nat {
    if (amount == 0 or bps == 0) {
      return 0;
    };
    (amount * bps) / 10_000
  };

  func accountFromText(p : Text) : Account {
    { owner = Principal.fromText(p); subaccount = null }
  };

  func getRouterAccount() : Account {
    { owner = Principal.fromActor(KONGRouter); subaccount = null }
  };

  func getCurrentTime() : Nat64 {
    Nat64.fromNat(Int.abs(Time.now()))
  };

  // ----------- ADMIN FUNCTIONS -----------
  
  public shared(msg) func set_fee_bps(new_bps : Nat) : async Result.Result<(), Text> {
    // TODO: Add proper access control here
    if (new_bps > max_fee_bps) {
      return #err("Fee cannot exceed " # Nat.toText(max_fee_bps) # " basis points");
    };
    fee_bps := new_bps;
    #ok(())
  };

  public shared query func get_fee_bps() : async Nat {
    fee_bps
  };

  // ----------- QUOTE FUNCTIONS -----------
  
  // Quote including your fee (what user sees) - NON-QUERY since it calls Kong
  public shared func quote_with_fee(
    pay_token_text : Text,
    pay_amount_raw : Nat,
    receive_token_text : Text
  ) : async Result.Result<{
    fee_amount : Nat;
    trade_amount : Nat;
    estimated_receive : Nat;
    price : Float;
    slippage : Float;
  }, Text> {
    
    let fee_amount = take_bps(pay_amount_raw, fee_bps);
    if (pay_amount_raw < fee_amount) {
      return #err("Amount too small - entire amount would be consumed by fee");
    };
    let trade_amount = pay_amount_raw - fee_amount;

    let quote = await kong.swap_amounts(pay_token_text, trade_amount, receive_token_text);
    switch (quote) {
      case (#Err(e)) { #err("Kong quote error: " # e) };
      case (#Ok(info)) {
        #ok({
          fee_amount = fee_amount;
          trade_amount = trade_amount;
          estimated_receive = info.receive_amount;
          price = info.price;
          slippage = info.slippage;
        })
      };
    }
  };

  // Direct Kong quote (no fee) - NON-QUERY since it calls Kong
  public shared func quote_without_fee(
    pay_token_text : Text,
    amount : Nat,
    receive_token_text : Text
  ) : async SwapAmountsResult {
    await kong.swap_amounts(pay_token_text, amount, receive_token_text)
  };

  // ----------- MAIN SWAP FUNCTION -----------
  
  public shared(msg) func swap_with_fee(
    pay_token_canister_id : Text,
    pay_amount_raw : Nat,
    receive_token_text : Text,
    pay_token_text : Text,
    max_slippage : ?Float,
    referred_by : ?Text,
    receive_address_override : ?Text
  ) : async SwapResult {

    let caller = msg.caller;
    let router_account = getRouterAccount();
    
    // 1) Validate amounts
    let fee_amount = take_bps(pay_amount_raw, fee_bps);
    if (pay_amount_raw < fee_amount) {
      return #Err("Amount too small - entire amount would be consumed by fee");
    };
    let trade_amount = pay_amount_raw - fee_amount;

    // 2) Get Kong quote for trade amount
    let quote = await kong.swap_amounts(pay_token_text, trade_amount, receive_token_text);
    let kong_info = switch (quote) {
      case (#Err(e)) { return #Err("Kong quote error: " # e) };
      case (#Ok(info)) {
        if (info.txs.size() == 0) {
          return #Err("No route found by Kong for this pair/amount");
        };
        info
      };
    };

    let kong_pay_account = accountFromText(kong_info.pay_address);
    let token : ICRC2 = actor ("ic:" # pay_token_canister_id);

    // 3) Check user's balance
    let user_account : Account = { owner = caller; subaccount = null };
    let user_balance = await token.icrc1_balance_of(user_account);
    if (user_balance < pay_amount_raw) {
      return #Err("Insufficient balance. Need: " # Nat.toText(pay_amount_raw) # ", Have: " # Nat.toText(user_balance));
    };

    // 4) Check allowance
    let allowance = await token.icrc2_allowance({
      account = user_account;
      spender = router_account;
    });
    if (allowance.allowance < pay_amount_raw) {
      return #Err("Insufficient allowance. Please approve " # Nat.toText(pay_amount_raw) # " tokens first");
    };

    // 5) Transfer full amount from user to router
    let user_to_router_result = await token.icrc2_transfer_from({
      spender_subaccount = null;
      from = user_account;
      to = router_account;
      amount = pay_amount_raw;
      fee = null;
      memo = null;
      created_at_time = ?getCurrentTime();
    });

    switch (user_to_router_result) {
      case (#Err(err)) {
        return #Err("Failed to receive user funds: " # debug_show(err));
      };
      case (#Ok(_)) {};
    };

    // 6) Send fee to treasury
    if (fee_amount > 0) {
      let fee_transfer_result = await token.icrc1_transfer({
        to = treasury;
        fee = null;
        memo = null;
        from_subaccount = null;
        created_at_time = ?getCurrentTime();
        amount = fee_amount;
      });
      
      switch (fee_transfer_result) {
        case (#Err(err)) {
          // Refund user if fee transfer fails
          ignore await token.icrc1_transfer({
            to = user_account;
            fee = null;
            memo = null;
            from_subaccount = null;
            created_at_time = ?getCurrentTime();
            amount = pay_amount_raw;
          });
          return #Err("Fee transfer failed, refunded user: " # debug_show(err));
        };
        case (#Ok(_)) {};
      };
    };

    // 7) Send trade amount to Kong
    let trade_transfer_result = await token.icrc1_transfer({
      to = kong_pay_account;
      fee = null;
      memo = null;
      from_subaccount = null;
      created_at_time = ?getCurrentTime();
      amount = trade_amount;
    });

    let block_index = switch (trade_transfer_result) {
      case (#Err(err)) {
        // Refund user (minus fee already taken)
        ignore await token.icrc1_transfer({
          to = user_account;
          fee = null;
          memo = null;
          from_subaccount = null;
          created_at_time = ?getCurrentTime();
          amount = trade_amount;
        });
        return #Err("Trade transfer failed, refunded remaining: " # debug_show(err));
      };
      case (#Ok(ix)) ix;
    };

    // 8) Execute Kong swap
    let swap_args : SwapArgs = {
      pay_token = pay_token_text;
      receive_token = receive_token_text;
      pay_amount = trade_amount;
      max_slippage = max_slippage;
      referred_by = referred_by;
      receive_amount = null;
      receive_address = receive_address_override;
      pay_tx_id = ?(#BlockIndex block_index);
    };

    await kong.swap(swap_args)
  };

  // ----------- UTILITY FUNCTIONS -----------
  
  // Helper for users to get approval parameters - QUERY function (no await)
  public shared query func get_approval_info(amount : Nat) : async {
    spender : Text;
    amount : Nat;
  } {
    {
      spender = Principal.toText(Principal.fromActor(KONGRouter));
      amount = amount;
    }
  };

  // Check router's balance - NON-QUERY since it calls external canister
  public shared func get_router_balance(token_canister_id : Text) : async Nat {
    let token : ICRC2 = actor ("ic:" # token_canister_id);
    await token.icrc1_balance_of(getRouterAccount())
  };

  // Get quote calculation without calling Kong - QUERY function for quick estimates
  public shared query func calculate_fee(pay_amount_raw : Nat) : async {
    fee_amount : Nat;
    trade_amount : Nat;
    fee_percentage : Float;
  } {
    let fee_amount = take_bps(pay_amount_raw, fee_bps);
    let trade_amount = if (pay_amount_raw >= fee_amount) {
      pay_amount_raw - fee_amount
    } else {
      0
    };
    {
      fee_amount = fee_amount;
      trade_amount = trade_amount;
      fee_percentage = Float.fromInt(fee_bps) / 10000.0;
    }
  };

  // Emergency withdraw function (add access control in production)
  public shared(msg) func emergency_withdraw(
    token_canister_id : Text,
    to_account : Account,
    amount : Nat
  ) : async Result.Result<Nat, Text> {
    // TODO: Add proper access control
    let token : ICRC2 = actor ("ic:" # token_canister_id);
    
    let result = await token.icrc1_transfer({
      to = to_account;
      fee = null;
      memo = null;
      from_subaccount = null;
      created_at_time = ?getCurrentTime();
      amount = amount;
    });
    
    switch (result) {
      case (#Ok(block)) { #ok(block) };
      case (#Err(err)) { #err("Emergency withdraw failed: " # debug_show(err)) };
    }
  };

}