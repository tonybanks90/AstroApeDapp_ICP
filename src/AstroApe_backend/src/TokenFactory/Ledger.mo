import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Result "mo:base/Result";

// Define the ICRC-1 Ledger actor interface
module {
    public type TransferArgs = {
        from_subaccount : ?Blob;
        to : { owner : Principal };
        amount : Nat;
        fee : ?Nat;
        memo : ?Blob;
        created_at_time : ?Nat;
    };

    public type TransferResult = {
        #Ok : Nat;
        #Err : Text;
    };

    public type BalanceArgs = {
        owner : Principal;
    };

    public type BalanceResult = Nat;

    public type LedgerInterface = actor {
        icrc1_transfer : shared TransferArgs -> async TransferResult;
        icrc1_balance_of : shared BalanceArgs -> async BalanceResult;
    };

    public func createLedgerActor(ledgerCanisterId : Principal) : LedgerInterface {
        actor (Principal.toText(ledgerCanisterId)) : LedgerInterface
    };
}