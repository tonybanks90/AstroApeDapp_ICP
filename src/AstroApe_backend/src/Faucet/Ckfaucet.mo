import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Debug "mo:base/Debug";
import Error "mo:base/Error";
import Text "mo:base/Text";

persistent actor {
  type Account = {
    owner: Principal;
    subaccount: ?[Nat8];
  };

  type TransferArg = {
    to: Account;
    fee: ?Nat;
    memo: ?Blob;
    from_subaccount: ?[Nat8];
    created_at_time: ?Nat64;
    amount: Nat;
  };

  type TransferError = {
    #BadFee: { expected_fee: Nat };
    #BadBurn: { min_burn_amount: Nat };
    #InsufficientFunds: { balance: Nat };
    #TooOld;
    #CreatedInFuture: { ledger_time: Nat64 };
    #Duplicate: { duplicate_of: Nat };
    #TemporarilyUnavailable;
    #GenericError: { error_code: Nat; message: Text };
  };

  type TransferResult = {
    #Ok : Nat;
    #Err : TransferError;
  };

  type Token = {
    #ckSepoliaETH;
    #ckTestBTC;
  };

  // Ledger canister IDs
  private func getLedgerCanisterId(token: Token) : Text {
    switch (token) {
      case (#ckSepoliaETH) { "apia6-jaaaa-aaaar-qabma-cai" };
      case (#ckTestBTC) { "mc6ru-gyaaa-aaaar-qaaaq-cai" };
    };
  };

  // Get token symbol for display
  private func getTokenSymbol(token: Token) : Text {
    switch (token) {
      case (#ckSepoliaETH) { "ckSepoliaETH" };
      case (#ckTestBTC) { "ckTestBTC" };
    };
  };

  // Generic transfer function
  private func transferToken(token: Token, to_principal: Principal, amount: Nat) : async Text {
    // Input validation
    if (Principal.isAnonymous(to_principal)) {
      return "❌ Invalid recipient: cannot send to anonymous principal";
    };

    if (amount == 0) {
      return "❌ Invalid amount: must be greater than 0";
    };

    let ledger_id = getLedgerCanisterId(token);
    let token_symbol = getTokenSymbol(token);
    
    let ledger = actor(ledger_id) : actor {
      icrc1_transfer: shared (TransferArg) -> async TransferResult;
    };

    let to_account : Account = {
      owner = to_principal;
      subaccount = null;
    };

    let transfer_args : TransferArg = {
      to = to_account;
      fee = null; // Let the ledger use default fee
      memo = null;
      from_subaccount = null;
      created_at_time = null;
      amount = amount;
    };

    try {
      let result = await ledger.icrc1_transfer(transfer_args);

      switch (result) {
        case (#Ok(txId)) {
          return "✅ " # token_symbol # " transfer successful. TxID: " # Nat.toText(txId);
        };
        case (#Err(#BadFee(details))) {
          return "❌ " # token_symbol # " transfer failed: Bad fee - expected: " # Nat.toText(details.expected_fee);
        };
        case (#Err(#InsufficientFunds(details))) {
          return "❌ " # token_symbol # " transfer failed: Insufficient funds - balance: " # Nat.toText(details.balance);
        };
        case (#Err(#TooOld)) {
          return "❌ " # token_symbol # " transfer failed: Transaction too old";
        };
        case (#Err(#CreatedInFuture(details))) {
          return "❌ " # token_symbol # " transfer failed: Transaction created in future - ledger time: " # Nat.toText(Nat64.toNat(details.ledger_time));
        };
        case (#Err(#Duplicate(details))) {
          return "❌ " # token_symbol # " transfer failed: Duplicate transaction - duplicate of: " # Nat.toText(details.duplicate_of);
        };
        case (#Err(#TemporarilyUnavailable)) {
          return "❌ " # token_symbol # " transfer failed: Ledger temporarily unavailable";
        };
        case (#Err(#GenericError(details))) {
          return "❌ " # token_symbol # " transfer failed: Generic error " # Nat.toText(details.error_code) # ": " # details.message;
        };
        case (#Err(#BadBurn(details))) {
          return "❌ " # token_symbol # " transfer failed: Bad burn - min amount: " # Nat.toText(details.min_burn_amount);
        };
      };
    } catch (error) {
      return "❌ " # token_symbol # " transfer failed with exception: " # Error.message(error);
    };
  };

  // Generic balance function
  private func getTokenBalance(token: Token, account: Account) : async Text {
    let ledger_id = getLedgerCanisterId(token);
    let token_symbol = getTokenSymbol(token);
    
    let balance_ledger = actor(ledger_id) : actor {
      icrc1_balance_of: shared (Account) -> async Nat;
    };

    try {
      let balance = await balance_ledger.icrc1_balance_of(account);
      return token_symbol # " Balance: " # Nat.toText(balance);
    } catch (error) {
      return "❌ Failed to get " # token_symbol # " balance: " # Error.message(error);
    };
  };

  // Public functions for ckSepoliaETH
  public shared(msg) func send_ckETH(to_principal: Principal, amount: Nat) : async Text {
    await transferToken(#ckSepoliaETH, to_principal, amount);
  };

  public shared(msg) func get_ckETH_balance() : async Text {
    let caller_account : Account = {
      owner = msg.caller;
      subaccount = null;
    };
    await getTokenBalance(#ckSepoliaETH, caller_account);
  };

  // Public functions for ckTestBTC
  public shared(msg) func send_ckBTC(to_principal: Principal, amount: Nat) : async Text {
    await transferToken(#ckTestBTC, to_principal, amount);
  };

  public shared(msg) func get_ckBTC_balance() : async Text {
    let caller_account : Account = {
      owner = msg.caller;
      subaccount = null;
    };
    await getTokenBalance(#ckTestBTC, caller_account);
  };

  // Generic public functions (if you want more flexibility)
  public shared(msg) func transfer_token(token: Token, to_principal: Principal, amount: Nat) : async Text {
    await transferToken(token, to_principal, amount);
  };

  public shared(msg) func get_balance(token: Token) : async Text {
    let caller_account : Account = {
      owner = msg.caller;
      subaccount = null;
    };
    await getTokenBalance(token, caller_account);
  };

  // Get balance for a specific account
  public shared func get_account_balance(token: Token, account: Account) : async Text {
    await getTokenBalance(token, account);
  };

  // Query function to get canister info
  public query func get_info() : async Text {
    return "Multi-Token Faucet - Supports ckSepoliaETH (apia6-jaaaa-aaaar-qabma-cai) and ckTestBTC (mc6ru-gyaaa-aaaar-qaaaq-cai)";
  };

  // Query function to get supported tokens
  public query func get_supported_tokens() : async Text {
    return "Supported tokens: ckSepoliaETH, ckTestBTC";
  };

  // Get minter and index canister info
  public query func get_canister_info(token: Token) : async Text {
    switch (token) {
      case (#ckSepoliaETH) {
        "ckSepoliaETH - Ledger: apia6-jaaaa-aaaar-qabma-cai";
      };
      case (#ckTestBTC) {
        "ckTestBTC - Ledger: mc6ru-gyaaa-aaaar-qaaaq-cai, Minter: ml52i-qqaaa-aaaar-qaaba-cai, Index: mm444-5iaaa-aaaar-qaabq-cai";
      };
    };
  };
}