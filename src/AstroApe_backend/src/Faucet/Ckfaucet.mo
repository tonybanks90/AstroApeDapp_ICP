import Principal "mo:base/Principal";
import Nat "mo:base/Nat";


actor {
  // Ledger canister interface
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

  type TransferResult = {
    #Ok: Nat;
    #Err: {
      #BadFee;
      #InsufficientFunds;
      #TxTooOld;
      #TxCreatedInFuture;
      #Duplicate;
      #Other: Text;
    };
  };

  // Replace with actual ckSepoliaETH canister ID
  let ledger = actor("ryjl3-tyaaa-aaaaa-aaaba-cai") : actor {
    icrc1_transfer: shared TransferArg -> async TransferResult;
  };

  // Send ckSepoliaETH to a Principal
  public shared func send_ckETH(to_principal: Principal, amount: Nat) : async Text {
    let to_account : Account = {
      owner = to_principal;
      subaccount = null;
    };

    let transfer_args : TransferArg = {
      to = to_account;
      fee = null; // Use default fee
      memo = null;
      from_subaccount = null;
      created_at_time = null;
      amount = amount;
    };

    let result = await ledger.icrc1_transfer(transfer_args);

    switch (result) {
      case (#Ok(txId)) {
        return "✅ Transfer successful. TxID: " # Nat.toText(txId);
      };
      case (#Err(err)) {
        return "❌ Transfer failed: " # debug_show(err);
      };
    };
  };
}
