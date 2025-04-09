import Result "mo:base/Result";
// src/icrc/lib.mo
module {
    public type Account = {
        owner : Principal;
        subaccount : ?Blob;
    };

    public type Tokens = Nat;
    
    public type TransferArgs = {
        from_subaccount : ?Blob;
        to : Account;
        amount : Nat;
        fee : ?Nat;
        memo : ?Blob;
        created_at_time : ?Nat64;
    };

    public type TransferError = {
        #BadFee : { expected_fee : Nat };
        #BadBurn : { min_burn_amount : Nat };
        #InsufficientFunds : { balance : Nat };
        #TooOld;
        #CreatedInFuture : { ledger_time : Nat64 };
        #Duplicate : { duplicate_of : Nat };
        #TemporarilyUnavailable;
        #GenericError : { error_code : Nat; message : Text };
    };

    public type TransferResult = Result.Result<{ block_height : Nat }, TransferError>;
    
    public type ApproveArgs = {
        spender : Account;
        amount : Nat;
        fee : ?Nat;
        memo : ?Blob;
        created_at_time : ?Nat64;
    };

    public type ApproveError = TransferError or {
        #InsufficientAllowance : { allowance : Nat };
    };

    public type ApproveResult = Result.Result<Nat, ApproveError>;

    public type Actor = actor {
        icrc1_balance_of : shared query (Account) -> async Nat;
        icrc1_transfer : shared (TransferArgs) -> async TransferResult;
        icrc2_approve : shared (ApproveArgs) -> async ApproveResult;
    };
};