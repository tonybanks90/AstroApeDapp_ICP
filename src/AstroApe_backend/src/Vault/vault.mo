import Debug "mo:base/Debug";
import Blob "mo:base/Blob";
import Buffer "mo:base/Buffer";
import HashMap "mo:base/HashMap";
import Int "mo:base/Int";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Nat64 "mo:base/Nat64";
import Nat8 "mo:base/Nat8";
import Option "mo:base/Option";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Time "mo:base/Time";
import TrieMap "mo:base/TrieMap";
import Array "mo:base/Array";

actor BondingCurveVault {
    
    // ===== TYPES =====
    
    public type CurveId = Nat;
    
    // Base pair types
    public type BasePair = {
        #ckBTC;  // Uses satoshis (8 decimals)
        #ckETH;  // Uses wei (18 decimals)
    };
    
    // ICRC-1/2 Account
    public type Account = {
        owner: Principal;
        subaccount: ?[Nat8];
    };
    
    public type TransferArgs = {
        from_subaccount: ?[Nat8];
        to: Account;
        amount: Nat;
        fee: ?Nat;
        memo: ?[Nat8];
        created_at_time: ?Nat64;
    };
    
    public type TransferFromArgs = {
        spender_subaccount: ?[Nat8];
        from: Account;
        to: Account;
        amount: Nat;
        fee: ?Nat;
        memo: ?[Nat8];
        created_at_time: ?Nat64;
    };
    
    public type TransferResult = {
        #Ok: Nat;
        #Err: TransferError;
    };
    
    public type TransferError = {
        #BadFee: { expected_fee: Nat };
        #BadBurn: { min_burn_amount: Nat };
        #InsufficientFunds: { balance: Nat };
        #InsufficientAllowance: { allowance: Nat };
        #TooOld;
        #CreatedInFuture: { ledger_time: Nat64 };
        #TemporarilyUnavailable;
        #Duplicate: { duplicate_of: Nat };
        #GenericError: { error_code: Nat; message: Text };
    };
    
    public type Allowance = {
        allowance: Nat;
        expires_at: ?Nat64;
    };
    
    public type AllowanceArgs = {
        account: Account;
        spender: Account;
    };
    
    // ICRC Ledger Interface
    public type ICRCLedger = actor {
        icrc1_transfer: (TransferArgs) -> async (TransferResult);
        icrc1_balance_of: (Account) -> async (Nat);
        icrc1_fee: () -> async (Nat);
        icrc2_transfer_from: (TransferFromArgs) -> async (TransferResult);
        icrc2_allowance: (AllowanceArgs) -> async (Allowance);
    };
    
    // Vault statistics for a bonding curve
    public type VaultStats = {
        curveId: CurveId;
        basePair: BasePair;
        subaccount: [Nat8];
        balance: Nat;
        totalDeposited: Nat;
        totalWithdrawn: Nat;
        transactionCount: Nat;
        active: Bool;
        registrationTime: Nat64;
        deactivationTime: ?Nat64;
    };
    
    // Transaction record
    public type TransactionRecord = {
        curveId: CurveId;
        operation: { #Deposit; #Withdrawal };
        user: Principal;
        amount: Nat;
        blockIndex: ?Nat;
        timestamp: Nat64;
        memo: ?Text;
    };
    
    // ===== STATE =====
    
    // Curve subaccounts storage
    stable var curveAccountsEntries : [(CurveId, [Nat8])] = [];
    private var curveAccounts = TrieMap.TrieMap<CurveId, [Nat8]>(Nat.equal, func(n: Nat) : Nat32 { Nat32.fromNat(n) });
    
    // Base pair tracking
    stable var basePairsEntries : [(CurveId, BasePair)] = [];
    private var basePairs = TrieMap.TrieMap<CurveId, BasePair>(Nat.equal, func(n: Nat) : Nat32 { Nat32.fromNat(n) });
    
    // Statistics tracking
    type StatsData = {
        totalDeposited: Nat;
        totalWithdrawn: Nat;
        transactionCount: Nat;
        lastActivity: Nat64;
    };
    
    stable var statsEntries : [(CurveId, StatsData)] = [];
    private var stats = TrieMap.TrieMap<CurveId, StatsData>(Nat.equal, func(n: Nat) : Nat32 { Nat32.fromNat(n) });
    
    // Active curves
    stable var activeCurvesEntries : [(CurveId, Bool)] = [];
    private var activeCurves = TrieMap.TrieMap<CurveId, Bool>(Nat.equal, func(n: Nat) : Nat32 { Nat32.fromNat(n) });
    
    // Registration times
    stable var registrationTimesEntries : [(CurveId, Nat64)] = [];
    private var registrationTimes = TrieMap.TrieMap<CurveId, Nat64>(Nat.equal, func(n: Nat) : Nat32 { Nat32.fromNat(n) });
    
    // Deactivation times
    stable var deactivationTimesEntries : [(CurveId, Nat64)] = [];
    private var deactivationTimes = TrieMap.TrieMap<CurveId, Nat64>(Nat.equal, func(n: Nat) : Nat32 { Nat32.fromNat(n) });
    
    // Configuration
    private stable var bondingCurveCanister : ?Principal = null;
    private stable var ckbtcLedger : Principal = Principal.fromText("mxzaz-hqaaa-aaaar-qaada-cai");
    private stable var ckethLedger : Principal = Principal.fromText("ss2fx-dyaaa-aaaar-qacoq-cai");
    private stable var ckbtcFee : Nat = 10; // satoshis
    private stable var ckethFee : Nat = 2_000_000_000_000; // wei (typical gas)
    
    // System stats
    private stable var totalCurvesRegistered : Nat = 0;
    private stable var totalTransactions : Nat = 0;
    
    // ===== INITIALIZATION =====
    
    public shared(msg) func initialize(bondingCurve: Principal) : async Result.Result<(), Text> {
        if (not Principal.isController(msg.caller)) {
            return #err("Only controller can initialize");
        };
        
        bondingCurveCanister := ?bondingCurve;
        
        // Fetch actual fees
        try {
            let ckbtcActor : ICRCLedger = actor(Principal.toText(ckbtcLedger));
            ckbtcFee := await ckbtcActor.icrc1_fee();
        } catch (error) {
            Debug.print("Warning: Using default ckBTC fee");
        };
        
        try {
            let ckethActor : ICRCLedger = actor(Principal.toText(ckethLedger));
            ckethFee := await ckethActor.icrc1_fee();
        } catch (error) {
            Debug.print("Warning: Using default ckETH fee");
        };
        
        Debug.print("Vault initialized for bonding curves");
        #ok()
    };
    
    // ===== SUBACCOUNT DERIVATION =====
    
    private func deriveSubaccount(curveId: CurveId) : [Nat8] {
        let buffer = Buffer.Buffer<Nat8>(32);
        
        // Fill with zeros
        for (i in Iter.range(0, 27)) {
            buffer.add(0);
        };
        
        // Add curve ID as big-endian 4-byte integer
        let idNat32 = Nat32.fromNat(curveId % (2**32));
        buffer.add(Nat8.fromNat(Nat32.toNat((idNat32 >> 24) & 0xFF)));
        buffer.add(Nat8.fromNat(Nat32.toNat((idNat32 >> 16) & 0xFF)));
        buffer.add(Nat8.fromNat(Nat32.toNat((idNat32 >> 8) & 0xFF)));
        buffer.add(Nat8.fromNat(Nat32.toNat(idNat32 & 0xFF)));
        
        Buffer.toArray(buffer)
    };
    
    private func getVaultAccount(subaccount: [Nat8]) : Account {
        {
            owner = Principal.fromActor(BondingCurveVault);
            subaccount = ?subaccount;
        }
    };
    
    // ===== CURVE REGISTRATION =====
    
    public shared(msg) func registerCurve(curveId: CurveId, basePair: BasePair) : async Result.Result<[Nat8], Text> {
        // Only bonding curve canister can register
        switch (bondingCurveCanister) {
            case (null) { return #err("Bonding curve canister not set") };
            case (?bc) {
                if (msg.caller != bc) {
                    return #err("Only bonding curve canister can register");
                }
            };
        };
        
        // Check if already registered
        switch (curveAccounts.get(curveId)) {
            case (?_) { return #err("Curve already registered") };
            case (null) {};
        };
        
        let subaccount = deriveSubaccount(curveId);
        let timestamp = Nat64.fromNat(Int.abs(Time.now()));
        
        curveAccounts.put(curveId, subaccount);
        basePairs.put(curveId, basePair);
        stats.put(curveId, {
            totalDeposited = 0;
            totalWithdrawn = 0;
            transactionCount = 0;
            lastActivity = timestamp;
        });
        activeCurves.put(curveId, true);
        registrationTimes.put(curveId, timestamp);
        
        totalCurvesRegistered += 1;
        
        Debug.print("Registered curve " # Nat.toText(curveId) # " with base pair " # debug_show(basePair));
        #ok(subaccount)
    };
    
    // ===== FUND OPERATIONS =====
    
    public shared(msg) func pullFunds(curveId: CurveId, user: Principal, amount: Nat) : async Result.Result<Nat, Text> {
        // Only bonding curve can call
        switch (bondingCurveCanister) {
            case (null) { return #err("Bonding curve canister not set") };
            case (?bc) {
                if (msg.caller != bc) {
                    return #err("Only bonding curve can pull funds");
                }
            };
        };
        
        // Get curve config
        let subaccount = switch (curveAccounts.get(curveId)) {
            case (null) { return #err("Curve not registered") };
            case (?sa) { sa };
        };
        
        let basePair = switch (basePairs.get(curveId)) {
            case (null) { return #err("Base pair not found") };
            case (?bp) { bp };
        };
        
        let active = switch (activeCurves.get(curveId)) {
            case (?false) { return #err("Curve not active") };
            case _ { true };
        };
        
        if (amount == 0) {
            return #err("Amount must be greater than zero");
        };
        
        // Select ledger and fee based on base pair
        let (ledger, fee) = switch (basePair) {
            case (#ckBTC) { (ckbtcLedger, ckbtcFee) };
            case (#ckETH) { (ckethLedger, ckethFee) };
        };
        
        let ledgerActor : ICRCLedger = actor(Principal.toText(ledger));
        let timestamp = Nat64.fromNat(Int.abs(Time.now()));
        
        let userAccount = { owner = user; subaccount = null };
        let vaultAccount = getVaultAccount(subaccount);
        
        // Check allowance
        try {
            let allowanceArgs = {
                account = userAccount;
                spender = { owner = Principal.fromActor(BondingCurveVault); subaccount = null };
            };
            let allowance = await ledgerActor.icrc2_allowance(allowanceArgs);
            
            if (allowance.allowance < amount + fee) {
                return #err("Insufficient allowance");
            };
        } catch (error) {
            return #err("Failed to check allowance");
        };
        
        // Execute transfer_from
        let transferArgs : TransferFromArgs = {
            spender_subaccount = null;
            from = userAccount;
            to = vaultAccount;
            amount = amount;
            fee = ?fee;
            memo = ?Blob.toArray(Text.encodeUtf8("BC deposit: " # Nat.toText(curveId)));
            created_at_time = ?timestamp;
        };
        
        switch (await ledgerActor.icrc2_transfer_from(transferArgs)) {
            case (#Ok(blockIndex)) {
                // Update stats
                switch (stats.get(curveId)) {
                    case (?s) {
                        stats.put(curveId, {
                            totalDeposited = s.totalDeposited + amount;
                            totalWithdrawn = s.totalWithdrawn;
                            transactionCount = s.transactionCount + 1;
                            lastActivity = timestamp;
                        });
                    };
                    case (null) {};
                };
                
                totalTransactions += 1;
                #ok(blockIndex)
            };
            case (#Err(error)) {
                let msg = switch (error) {
                    case (#InsufficientFunds(d)) { "Insufficient funds: " # Nat.toText(d.balance) };
                    case (#InsufficientAllowance(d)) { "Insufficient allowance: " # Nat.toText(d.allowance) };
                    case _ { "Transfer failed" };
                };
                #err(msg)
            };
        }
    };
    
    public shared(msg) func payFunds(curveId: CurveId, user: Principal, amount: Nat) : async Result.Result<Nat, Text> {
        // Only bonding curve can call
        switch (bondingCurveCanister) {
            case (null) { return #err("Bonding curve canister not set") };
            case (?bc) {
                if (msg.caller != bc) {
                    return #err("Only bonding curve can pay funds");
                }
            };
        };
        
        let subaccount = switch (curveAccounts.get(curveId)) {
            case (null) { return #err("Curve not registered") };
            case (?sa) { sa };
        };
        
        let basePair = switch (basePairs.get(curveId)) {
            case (null) { return #err("Base pair not found") };
            case (?bp) { bp };
        };
        
        if (amount == 0) {
            return #err("Amount must be greater than zero");
        };
        
        let (ledger, fee) = switch (basePair) {
            case (#ckBTC) { (ckbtcLedger, ckbtcFee) };
            case (#ckETH) { (ckethLedger, ckethFee) };
        };
        
        let ledgerActor : ICRCLedger = actor(Principal.toText(ledger));
        let timestamp = Nat64.fromNat(Int.abs(Time.now()));
        
        let userAccount = { owner = user; subaccount = null };
        let vaultAccount = getVaultAccount(subaccount);
        
        // Check balance
        let balance = await ledgerActor.icrc1_balance_of(vaultAccount);
        if (balance < amount + fee) {
            return #err("Insufficient vault balance");
        };
        
        // Execute transfer
        let transferArgs : TransferArgs = {
            from_subaccount = ?subaccount;
            to = userAccount;
            amount = amount;
            fee = ?fee;
            memo = ?Blob.toArray(Text.encodeUtf8("BC payout: " # Nat.toText(curveId)));
            created_at_time = ?timestamp;
        };
        
        switch (await ledgerActor.icrc1_transfer(transferArgs)) {
            case (#Ok(blockIndex)) {
                // Update stats
                switch (stats.get(curveId)) {
                    case (?s) {
                        stats.put(curveId, {
                            totalDeposited = s.totalDeposited;
                            totalWithdrawn = s.totalWithdrawn + amount;
                            transactionCount = s.transactionCount + 1;
                            lastActivity = timestamp;
                        });
                    };
                    case (null) {};
                };
                
                totalTransactions += 1;
                #ok(blockIndex)
            };
            case (#Err(error)) {
                #err("Transfer failed")
            };
        }
    };
    
    // ===== QUERIES =====
    
    public query func getVaultStats(curveId: CurveId) : async Result.Result<VaultStats, Text> {
        let subaccount = switch (curveAccounts.get(curveId)) {
            case (null) { return #err("Curve not registered") };
            case (?sa) { sa };
        };
        
        let basePair = switch (basePairs.get(curveId)) {
            case (null) { return #err("Base pair not found") };
            case (?bp) { bp };
        };
        
        let curveStats = switch (stats.get(curveId)) {
            case (null) { 
                { totalDeposited = 0; totalWithdrawn = 0; transactionCount = 0; lastActivity = 0 }
            };
            case (?s) { s };
        };
        
        let active = switch (activeCurves.get(curveId)) {
            case (?a) { a };
            case (null) { false };
        };
        
        let regTime = switch (registrationTimes.get(curveId)) {
            case (?t) { t };
            case (null) { 0 };
        };
        
        let deactivTime = deactivationTimes.get(curveId);
        
        #ok({
            curveId = curveId;
            basePair = basePair;
            subaccount = subaccount;
            balance = 0; // Requires async call
            totalDeposited = curveStats.totalDeposited;
            totalWithdrawn = curveStats.totalWithdrawn;
            transactionCount = curveStats.transactionCount;
            active = active;
            registrationTime = regTime;
            deactivationTime = deactivTime;
        })
    };
    
    public func getBalance(curveId: CurveId) : async Result.Result<Nat, Text> {
        let subaccount = switch (curveAccounts.get(curveId)) {
            case (null) { return #err("Curve not registered") };
            case (?sa) { sa };
        };
        
        let basePair = switch (basePairs.get(curveId)) {
            case (null) { return #err("Base pair not found") };
            case (?bp) { bp };
        };
        
        let ledger = switch (basePair) {
            case (#ckBTC) { ckbtcLedger };
            case (#ckETH) { ckethLedger };
        };
        
        try {
            let ledgerActor : ICRCLedger = actor(Principal.toText(ledger));
            let balance = await ledgerActor.icrc1_balance_of(getVaultAccount(subaccount));
            #ok(balance)
        } catch (error) {
            #err("Failed to get balance")
        }
    };
    
    public query func getSystemStats() : async {
        totalCurves: Nat;
        totalTransactions: Nat;
        ckbtcCurves: Nat;
        ckethCurves: Nat;
    } {
        var ckbtcCount = 0;
        var ckethCount = 0;
        
        for ((_, bp) in basePairs.entries()) {
            switch (bp) {
                case (#ckBTC) { ckbtcCount += 1 };
                case (#ckETH) { ckethCount += 1 };
            };
        };
        
        {
            totalCurves = totalCurvesRegistered;
            totalTransactions = totalTransactions;
            ckbtcCurves = ckbtcCount;
            ckethCurves = ckethCount;
        }
    };
    
    // ===== ADMIN =====
    
    public shared(msg) func deactivateCurve(curveId: CurveId) : async Result.Result<(), Text> {
        switch (bondingCurveCanister) {
            case (null) { return #err("Bonding curve canister not set") };
            case (?bc) {
                if (msg.caller != bc) {
                    return #err("Only bonding curve can deactivate");
                }
            };
        };
        
        activeCurves.put(curveId, false);
        deactivationTimes.put(curveId, Nat64.fromNat(Int.abs(Time.now())));
        #ok()
    };
    
    // ===== UPGRADE HOOKS =====
    
    system func preupgrade() {
        curveAccountsEntries := Iter.toArray(curveAccounts.entries());
        basePairsEntries := Iter.toArray(basePairs.entries());
        statsEntries := Iter.toArray(stats.entries());
        activeCurvesEntries := Iter.toArray(activeCurves.entries());
        registrationTimesEntries := Iter.toArray(registrationTimes.entries());
        deactivationTimesEntries := Iter.toArray(deactivationTimes.entries());
    };
    
    system func postupgrade() {
        curveAccounts := TrieMap.fromEntries(curveAccountsEntries.vals(), Nat.equal, func(n: Nat) : Nat32 { Nat32.fromNat(n) });
        basePairs := TrieMap.fromEntries(basePairsEntries.vals(), Nat.equal, func(n: Nat) : Nat32 { Nat32.fromNat(n) });
        stats := TrieMap.fromEntries(statsEntries.vals(), Nat.equal, func(n: Nat) : Nat32 { Nat32.fromNat(n) });
        activeCurves := TrieMap.fromEntries(activeCurvesEntries.vals(), Nat.equal, func(n: Nat) : Nat32 { Nat32.fromNat(n) });
        registrationTimes := TrieMap.fromEntries(registrationTimesEntries.vals(), Nat.equal, func(n: Nat) : Nat32 { Nat32.fromNat(n) });
        deactivationTimes := TrieMap.fromEntries(deactivationTimesEntries.vals(), Nat.equal, func(n: Nat) : Nat32 { Nat32.fromNat(n) });
        
        curveAccountsEntries := [];
        basePairsEntries := [];
        statsEntries := [];
        activeCurvesEntries := [];
        registrationTimesEntries := [];
        deactivationTimesEntries := [];
    };
}