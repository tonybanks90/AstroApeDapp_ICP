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

persistent actor BondingCurveVault {
    
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
    
    // Subaccount configuration
    public type SubaccountConfig = {
        maxWithdrawalAmount: ?Nat;
        paused: Bool;
        allowedCallers: ?[Principal];
    };
    
    // ===== STATE =====
    
    // Curve subaccounts storage
    stable var curveAccountsEntries : [(CurveId, [Nat8])] = [];
    private transient var curveAccounts = TrieMap.TrieMap<CurveId, [Nat8]>(Nat.equal, func(n: Nat) : Nat32 { Nat32.fromNat(n) });
    
    // Base pair tracking
    stable var basePairsEntries : [(CurveId, BasePair)] = [];
    private transient var basePairs = TrieMap.TrieMap<CurveId, BasePair>(Nat.equal, func(n: Nat) : Nat32 { Nat32.fromNat(n) });
    
    // Statistics tracking
    type StatsData = {
        totalDeposited: Nat;
        totalWithdrawn: Nat;
        transactionCount: Nat;
        lastActivity: Nat64;
    };
    
    stable var statsEntries : [(CurveId, StatsData)] = [];
    private transient var stats = TrieMap.TrieMap<CurveId, StatsData>(Nat.equal, func(n: Nat) : Nat32 { Nat32.fromNat(n) });
    
    // Active curves
    stable var activeCurvesEntries : [(CurveId, Bool)] = [];
    private transient var activeCurves = TrieMap.TrieMap<CurveId, Bool>(Nat.equal, func(n: Nat) : Nat32 { Nat32.fromNat(n) });
    
    // Registration times
    stable var registrationTimesEntries : [(CurveId, Nat64)] = [];
    private transient var registrationTimes = TrieMap.TrieMap<CurveId, Nat64>(Nat.equal, func(n: Nat) : Nat32 { Nat32.fromNat(n) });
    
    // Deactivation times
    stable var deactivationTimesEntries : [(CurveId, Nat64)] = [];
    private transient var deactivationTimes = TrieMap.TrieMap<CurveId, Nat64>(Nat.equal, func(n: Nat) : Nat32 { Nat32.fromNat(n) });
    
    // Per-subaccount configurations (NEW)
    stable var subaccountConfigsEntries : [(CurveId, SubaccountConfig)] = [];
    private transient var subaccountConfigs = TrieMap.TrieMap<CurveId, SubaccountConfig>(Nat.equal, func(n: Nat) : Nat32 { Nat32.fromNat(n) });
    
    // Transaction history (NEW - limited size for recent transactions)
    stable var recentTransactionsEntries : [(CurveId, [TransactionRecord])] = [];
    private transient var recentTransactions = TrieMap.TrieMap<CurveId, [TransactionRecord]>(Nat.equal, func(n: Nat) : Nat32 { Nat32.fromNat(n) });
    private transient let MAX_RECENT_TRANSACTIONS : Nat = 100;
    
    // Configuration
    private stable var bondingCurveCanister : ?Principal = null;
    private stable var ckbtcLedger : Principal = Principal.fromText("mxzaz-hqaaa-aaaar-qaada-cai");
    private stable var ckethLedger : Principal = Principal.fromText("ss2fx-dyaaa-aaaar-qacoq-cai");
    private stable var ckbtcFee : Nat = 10; // satoshis
    private stable var ckethFee : Nat = 2_000_000_000_000; // wei (typical gas)
    
    // System stats
    private stable var totalCurvesRegistered : Nat = 0;
    private stable var totalTransactions : Nat = 0;
    private stable var totalVolumeDeposited : Nat = 0;
    private stable var totalVolumeWithdrawn : Nat = 0;
    
    // Emergency pause (NEW)
    private stable var emergencyPaused : Bool = false;
    
    // ===== INITIALIZATION =====
    
    public shared(msg) func initialize(bondingCurve: Principal) : async Result.Result<(), Text> {
        if (not Principal.isController(msg.caller)) {
            return #err("Only controller can initialize");
        };
        
        if (bondingCurveCanister != null) {
            return #err("Already initialized");
        };
        
        bondingCurveCanister := ?bondingCurve;
        
        // Fetch actual fees
        try {
            let ckbtcActor : ICRCLedger = actor(Principal.toText(ckbtcLedger));
            ckbtcFee := await ckbtcActor.icrc1_fee();
            Debug.print("ckBTC fee updated: " # Nat.toText(ckbtcFee));
        } catch (error) {
            Debug.print("Warning: Using default ckBTC fee");
        };
        
        try {
            let ckethActor : ICRCLedger = actor(Principal.toText(ckethLedger));
            ckethFee := await ckethActor.icrc1_fee();
            Debug.print("ckETH fee updated: " # Nat.toText(ckethFee));
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
        
        // Validate curve ID
        if (curveId == 0) {
            return #err("Invalid curve ID");
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
        
        // Initialize default subaccount config
        subaccountConfigs.put(curveId, {
            maxWithdrawalAmount = null;
            paused = false;
            allowedCallers = null;
        });
        
        // Initialize empty transaction history
        recentTransactions.put(curveId, []);
        
        totalCurvesRegistered += 1;
        
        Debug.print("Registered curve " # Nat.toText(curveId) # " with base pair " # debug_show(basePair));
        #ok(subaccount)
    };
    
    // ===== SECURITY HELPERS =====
    
    private func checkEmergencyPause() : Result.Result<(), Text> {
        if (emergencyPaused) {
            return #err("Vault is emergency paused");
        };
        #ok()
    };
    
    private func checkSubaccountPause(curveId: CurveId) : Result.Result<(), Text> {
        switch (subaccountConfigs.get(curveId)) {
            case (?config) {
                if (config.paused) {
                    return #err("Subaccount is paused");
                };
            };
            case (null) {};
        };
        #ok()
    };
    
    private func validateWithdrawalLimit(curveId: CurveId, amount: Nat) : Result.Result<(), Text> {
        switch (subaccountConfigs.get(curveId)) {
            case (?config) {
                switch (config.maxWithdrawalAmount) {
                    case (?maxAmount) {
                        if (amount > maxAmount) {
                            return #err("Withdrawal amount exceeds limit: " # Nat.toText(maxAmount));
                        };
                    };
                    case (null) {};
                };
            };
            case (null) {};
        };
        #ok()
    };
    
    private func addTransactionRecord(curveId: CurveId, record: TransactionRecord) {
        switch (recentTransactions.get(curveId)) {
            case (?transactions) {
                let buffer = Buffer.Buffer<TransactionRecord>(transactions.size() + 1);
                buffer.add(record);
                
                // Add existing transactions up to limit
                var count = 0;
                for (tx in transactions.vals()) {
                    if (count < MAX_RECENT_TRANSACTIONS - 1) {
                        buffer.add(tx);
                        count += 1;
                    };
                };
                
                recentTransactions.put(curveId, Buffer.toArray(buffer));
            };
            case (null) {
                recentTransactions.put(curveId, [record]);
            };
        };
    };
    
    // ===== FUND OPERATIONS =====
    
    public shared(msg) func pullFunds(curveId: CurveId, user: Principal, amount: Nat) : async Result.Result<Nat, Text> {
        // Security checks
        switch (checkEmergencyPause()) {
            case (#err(e)) { return #err(e) };
            case (#ok()) {};
        };
        
        switch (checkSubaccountPause(curveId)) {
            case (#err(e)) { return #err(e) };
            case (#ok()) {};
        };
        
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
        
        // Check allowance with detailed reporting
        try {
            let allowanceArgs = {
                account = userAccount;
                spender = { owner = Principal.fromActor(BondingCurveVault); subaccount = null };
            };
            let allowance = await ledgerActor.icrc2_allowance(allowanceArgs);
            let required = amount + fee;
            
            if (allowance.allowance < required) {
                return #err("Insufficient allowance. Required: " # Nat.toText(required) # 
                           ", Available: " # Nat.toText(allowance.allowance));
            };
            
            Debug.print("Allowance check passed: " # Nat.toText(allowance.allowance) # 
                       " >= " # Nat.toText(required));
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
                
                // Add transaction record
                let record : TransactionRecord = {
                    curveId = curveId;
                    operation = #Deposit;
                    user = user;
                    amount = amount;
                    blockIndex = ?blockIndex;
                    timestamp = timestamp;
                    memo = ?"BC deposit";
                };
                addTransactionRecord(curveId, record);
                
                totalTransactions += 1;
                totalVolumeDeposited += amount;
                
                Debug.print("Pulled " # Nat.toText(amount) # " from user " # Principal.toText(user) # 
                           " to curve " # Nat.toText(curveId) # " (block: " # Nat.toText(blockIndex) # ")");
                
                #ok(blockIndex)
            };
            case (#Err(error)) {
                let msg = switch (error) {
                    case (#InsufficientFunds(d)) { 
                        "Insufficient funds. Balance: " # Nat.toText(d.balance) # 
                        ", Required: " # Nat.toText(amount + fee)
                    };
                    case (#InsufficientAllowance(d)) { 
                        "Insufficient allowance: " # Nat.toText(d.allowance) 
                    };
                    case (#BadFee(d)) { 
                        "Bad fee. Expected: " # Nat.toText(d.expected_fee) 
                    };
                    case (#TooOld) { "Transaction too old" };
                    case (#CreatedInFuture(_)) { "Transaction created in future" };
                    case (#TemporarilyUnavailable) { "Ledger temporarily unavailable" };
                    case (#GenericError(d)) { 
                        "Error " # Nat.toText(d.error_code) # ": " # d.message 
                    };
                    case _ { "Transfer failed" };
                };
                #err(msg)
            };
        }
    };
    
    public shared(msg) func payFunds(curveId: CurveId, user: Principal, amount: Nat) : async Result.Result<Nat, Text> {
        // Security checks
        switch (checkEmergencyPause()) {
            case (#err(e)) { return #err(e) };
            case (#ok()) {};
        };
        
        switch (checkSubaccountPause(curveId)) {
            case (#err(e)) { return #err(e) };
            case (#ok()) {};
        };
        
        switch (validateWithdrawalLimit(curveId, amount)) {
            case (#err(e)) { return #err(e) };
            case (#ok()) {};
        };
        
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
        
        // Check balance with detailed reporting
        let balance = await ledgerActor.icrc1_balance_of(vaultAccount);
        let required = amount + fee;
        
        if (balance < required) {
            return #err("Insufficient vault balance. Available: " # Nat.toText(balance) # 
                       ", Required: " # Nat.toText(required));
        };
        
        Debug.print("Balance check passed: " # Nat.toText(balance) # " >= " # Nat.toText(required));
        
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
                
                // Add transaction record
                let record : TransactionRecord = {
                    curveId = curveId;
                    operation = #Withdrawal;
                    user = user;
                    amount = amount;
                    blockIndex = ?blockIndex;
                    timestamp = timestamp;
                    memo = ?"BC payout";
                };
                addTransactionRecord(curveId, record);
                
                totalTransactions += 1;
                totalVolumeWithdrawn += amount;
                
                Debug.print("Paid " # Nat.toText(amount) # " from curve " # Nat.toText(curveId) # 
                           " to user " # Principal.toText(user) # " (block: " # Nat.toText(blockIndex) # ")");
                
                #ok(blockIndex)
            };
            case (#Err(error)) {
                let msg = switch (error) {
                    case (#InsufficientFunds(d)) { 
                        "Insufficient funds: " # Nat.toText(d.balance) 
                    };
                    case (#BadFee(d)) { 
                        "Bad fee. Expected: " # Nat.toText(d.expected_fee) 
                    };
                    case _ { "Transfer failed" };
                };
                #err(msg)
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
            case (null) { 0 : Nat64 };
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
        totalVolumeDeposited: Nat;
        totalVolumeWithdrawn: Nat;
        ckbtcCurves: Nat;
        ckethCurves: Nat;
        emergencyPaused: Bool;
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
            totalVolumeDeposited = totalVolumeDeposited;
            totalVolumeWithdrawn = totalVolumeWithdrawn;
            ckbtcCurves = ckbtcCount;
            ckethCurves = ckethCount;
            emergencyPaused = emergencyPaused;
        }
    };
    
    public query func getRecentTransactions(curveId: CurveId) : async Result.Result<[TransactionRecord], Text> {
        switch (recentTransactions.get(curveId)) {
            case (null) { #err("No transactions found") };
            case (?txs) { #ok(txs) };
        }
    };
    
    public query func getSubaccountConfig(curveId: CurveId) : async Result.Result<SubaccountConfig, Text> {
        switch (subaccountConfigs.get(curveId)) {
            case (null) { #err("Curve not registered") };
            case (?config) { #ok(config) };
        }
    };
    
    // ===== ADMIN - VAULT-WIDE CONFIGURATION =====
    
    public shared(msg) func updateVaultConfiguration(
        newBondingCurve: ?Principal,
        newCkbtcLedger: ?Principal,
        newCkethLedger: ?Principal
    ) : async Result.Result<(), Text> {
        if (not Principal.isController(msg.caller)) {
            return #err("Only controller can update vault configuration");
        };
        
        switch (newBondingCurve) {
            case (?bc) {
                bondingCurveCanister := ?bc;
                Debug.print("Updated bonding curve canister to: " # Principal.toText(bc));
            };
            case (null) {};
        };
        
        switch (newCkbtcLedger) {
            case (?ledger) {
                ckbtcLedger := ledger;
                // Update fee
                try {
                    let ledgerActor : ICRCLedger = actor(Principal.toText(ledger));
                    ckbtcFee := await ledgerActor.icrc1_fee();
                    Debug.print("Updated ckBTC ledger and fee: " # Nat.toText(ckbtcFee));
                } catch (error) {
                    Debug.print("Warning: Could not fetch ckBTC fee from new ledger");
                };
            };
            case (null) {};
        };
        
        switch (newCkethLedger) {
            case (?ledger) {
                ckethLedger := ledger;
                // Update fee
                try {
                    let ledgerActor : ICRCLedger = actor(Principal.toText(ledger));
                    ckethFee := await ledgerActor.icrc1_fee();
                    Debug.print("Updated ckETH ledger and fee: " # Nat.toText(ckethFee));
                } catch (error) {
                    Debug.print("Warning: Could not fetch ckETH fee from new ledger");
                };
            };
            case (null) {};
        };
        
        #ok()
    };
    
    public shared(msg) func updateFees() : async Result.Result<{ ckbtc: Nat; cketh: Nat }, Text> {
        if (not Principal.isController(msg.caller)) {
            return #err("Only controller can update fees");
        };
        
        // Update ckBTC fee
        try {
            let ckbtcActor : ICRCLedger = actor(Principal.toText(ckbtcLedger));
            ckbtcFee := await ckbtcActor.icrc1_fee();
        } catch (error) {
            Debug.print("Warning: Could not fetch ckBTC fee");
        };
        
        // Update ckETH fee
        try {
            let ckethActor : ICRCLedger = actor(Principal.toText(ckethLedger));
            ckethFee := await ckethActor.icrc1_fee();
        } catch (error) {
            Debug.print("Warning: Could not fetch ckETH fee");
        };
        
        Debug.print("Updated fees - ckBTC: " # Nat.toText(ckbtcFee) # ", ckETH: " # Nat.toText(ckethFee));
        #ok({ ckbtc = ckbtcFee; cketh = ckethFee })
    };
    
    // ===== ADMIN - PER-SUBACCOUNT CONFIGURATION =====
    
    public shared(msg) func updateSubaccountConfig(
        curveId: CurveId,
        maxWithdrawalAmount: ?Nat,
        paused: ?Bool,
        allowedCallers: ?[Principal]
    ) : async Result.Result<(), Text> {
        if (not Principal.isController(msg.caller)) {
            return #err("Only controller can update subaccount configuration");
        };
        
        // Check if curve exists
        switch (curveAccounts.get(curveId)) {
            case (null) { return #err("Curve not registered") };
            case (?_) {};
        };
        
        let currentConfig = switch (subaccountConfigs.get(curveId)) {
            case (?config) { config };
            case (null) {
                {
                    maxWithdrawalAmount = null;
                    paused = false;
                    allowedCallers = null;
                }
            };
        };
        
        let newConfig = {
            maxWithdrawalAmount = switch (maxWithdrawalAmount) {
                case (?amount) { ?amount };
                case (null) { currentConfig.maxWithdrawalAmount };
            };
            paused = switch (paused) {
                case (?p) { p };
                case (null) { currentConfig.paused };
            };
            allowedCallers = switch (allowedCallers) {
                case (?callers) { ?callers };
                case (null) { currentConfig.allowedCallers };
            };
        };
        
        subaccountConfigs.put(curveId, newConfig);
        
        Debug.print("Updated configuration for curve " # Nat.toText(curveId) # 
                   ": maxWithdrawal=" # debug_show(newConfig.maxWithdrawalAmount) # 
                   ", paused=" # debug_show(newConfig.paused));
        
        #ok()
    };
    
    public shared(msg) func setSubaccountWithdrawalLimit(
        curveId: CurveId,
        maxAmount: ?Nat
    ) : async Result.Result<(), Text> {
        if (not Principal.isController(msg.caller)) {
            return #err("Only controller can set withdrawal limits");
        };
        
        switch (curveAccounts.get(curveId)) {
            case (null) { return #err("Curve not registered") };
            case (?_) {};
        };
        
        let currentConfig = switch (subaccountConfigs.get(curveId)) {
            case (?config) { config };
            case (null) {
                {
                    maxWithdrawalAmount = null;
                    paused = false;
                    allowedCallers = null;
                }
            };
        };
        
        subaccountConfigs.put(curveId, {
            maxWithdrawalAmount = maxAmount;
            paused = currentConfig.paused;
            allowedCallers = currentConfig.allowedCallers;
        });
        
        Debug.print("Set withdrawal limit for curve " # Nat.toText(curveId) # ": " # debug_show(maxAmount));
        #ok()
    };
    
    public shared(msg) func pauseSubaccount(curveId: CurveId) : async Result.Result<(), Text> {
        if (not Principal.isController(msg.caller)) {
            return #err("Only controller can pause subaccounts");
        };
        
        switch (curveAccounts.get(curveId)) {
            case (null) { return #err("Curve not registered") };
            case (?_) {};
        };
        
        let currentConfig = switch (subaccountConfigs.get(curveId)) {
            case (?config) { config };
            case (null) {
                {
                    maxWithdrawalAmount = null;
                    paused = false;
                    allowedCallers = null;
                }
            };
        };
        
        subaccountConfigs.put(curveId, {
            maxWithdrawalAmount = currentConfig.maxWithdrawalAmount;
            paused = true;
            allowedCallers = currentConfig.allowedCallers;
        });
        
        Debug.print("Paused subaccount for curve " # Nat.toText(curveId));
        #ok()
    };
    
    public shared(msg) func unpauseSubaccount(curveId: CurveId) : async Result.Result<(), Text> {
        if (not Principal.isController(msg.caller)) {
            return #err("Only controller can unpause subaccounts");
        };
        
        switch (curveAccounts.get(curveId)) {
            case (null) { return #err("Curve not registered") };
            case (?_) {};
        };
        
        let currentConfig = switch (subaccountConfigs.get(curveId)) {
            case (?config) { config };
            case (null) {
                {
                    maxWithdrawalAmount = null;
                    paused = false;
                    allowedCallers = null;
                }
            };
        };
        
        subaccountConfigs.put(curveId, {
            maxWithdrawalAmount = currentConfig.maxWithdrawalAmount;
            paused = false;
            allowedCallers = currentConfig.allowedCallers;
        });
        
        Debug.print("Unpaused subaccount for curve " # Nat.toText(curveId));
        #ok()
    };
    
    // ===== EMERGENCY CONTROLS =====
    
    public shared(msg) func emergencyPause() : async Result.Result<(), Text> {
        if (not Principal.isController(msg.caller)) {
            return #err("Only controller can emergency pause");
        };
        
        emergencyPaused := true;
        Debug.print("EMERGENCY PAUSE ACTIVATED");
        #ok()
    };
    
    public shared(msg) func emergencyUnpause() : async Result.Result<(), Text> {
        if (not Principal.isController(msg.caller)) {
            return #err("Only controller can emergency unpause");
        };
        
        emergencyPaused := false;
        Debug.print("Emergency pause deactivated");
        #ok()
    };
    
    public shared(msg) func deactivateCurve(curveId: CurveId) : async Result.Result<(), Text> {
        // Can be called by controller OR bonding curve canister
        let authorized = Principal.isController(msg.caller) or (
            switch (bondingCurveCanister) {
                case (?bc) { msg.caller == bc };
                case (null) { false };
            }
        );
        
        if (not authorized) {
            return #err("Only controller or bonding curve can deactivate");
        };
        
        switch (curveAccounts.get(curveId)) {
            case (null) { return #err("Curve not registered") };
            case (?_) {};
        };
        
        activeCurves.put(curveId, false);
        deactivationTimes.put(curveId, Nat64.fromNat(Int.abs(Time.now())));
        
        Debug.print("Deactivated curve " # Nat.toText(curveId));
        #ok()
    };
    
    public shared(msg) func reactivateCurve(curveId: CurveId) : async Result.Result<(), Text> {
        if (not Principal.isController(msg.caller)) {
            return #err("Only controller can reactivate curves");
        };
        
        switch (curveAccounts.get(curveId)) {
            case (null) { return #err("Curve not registered") };
            case (?_) {};
        };
        
        activeCurves.put(curveId, true);
        deactivationTimes.delete(curveId);
        
        Debug.print("Reactivated curve " # Nat.toText(curveId));
        #ok()
    };
    
    // ===== AUDIT AND MONITORING =====
    
    public query func getCurveVaultAccount(curveId: CurveId) : async Result.Result<Account, Text> {
        switch (curveAccounts.get(curveId)) {
            case (null) { #err("Curve not registered") };
            case (?subaccount) {
                #ok({
                    owner = Principal.fromActor(BondingCurveVault);
                    subaccount = ?subaccount;
                })
            };
        }
    };
    
    public func checkUserAllowance(user: Principal, basePair: BasePair, amount: Nat) : async Result.Result<{
        allowance: Nat;
        sufficient: Bool;
        required: Nat;
    }, Text> {
        let (ledger, fee) = switch (basePair) {
            case (#ckBTC) { (ckbtcLedger, ckbtcFee) };
            case (#ckETH) { (ckethLedger, ckethFee) };
        };
        
        try {
            let ledgerActor : ICRCLedger = actor(Principal.toText(ledger));
            let allowanceArgs = {
                account = { owner = user; subaccount = null };
                spender = { owner = Principal.fromActor(BondingCurveVault); subaccount = null };
            };
            let allowanceResult = await ledgerActor.icrc2_allowance(allowanceArgs);
            let required = amount + fee;
            
            #ok({
                allowance = allowanceResult.allowance;
                sufficient = allowanceResult.allowance >= required;
                required = required;
            })
        } catch (error) {
            #err("Failed to check allowance")
        };
    };
    
    public query func getConfiguration() : async {
        bondingCurveCanister: ?Principal;
        ckbtcLedger: Principal;
        ckethLedger: Principal;
        ckbtcFee: Nat;
        ckethFee: Nat;
        totalCurves: Nat;
        totalTransactions: Nat;
        totalVolumeDeposited: Nat;
        totalVolumeWithdrawn: Nat;
        emergencyPaused: Bool;
    } {
        {
            bondingCurveCanister = bondingCurveCanister;
            ckbtcLedger = ckbtcLedger;
            ckethLedger = ckethLedger;
            ckbtcFee = ckbtcFee;
            ckethFee = ckethFee;
            totalCurves = totalCurvesRegistered;
            totalTransactions = totalTransactions;
            totalVolumeDeposited = totalVolumeDeposited;
            totalVolumeWithdrawn = totalVolumeWithdrawn;
            emergencyPaused = emergencyPaused;
        }
    };
    
    public query func validateCurve(curveId: CurveId) : async Result.Result<{
        exists: Bool;
        active: Bool;
        paused: Bool;
        basePair: ?BasePair;
        subaccount: ?[Nat8];
        config: ?SubaccountConfig;
    }, Text> {
        let exists = switch (curveAccounts.get(curveId)) {
            case (null) { false };
            case (?_) { true };
        };
        
        if (not exists) {
            return #err("Curve does not exist");
        };
        
        let active = switch (activeCurves.get(curveId)) {
            case (?status) { status };
            case (null) { false };
        };
        
        let config = subaccountConfigs.get(curveId);
        let paused = switch (config) {
            case (?c) { c.paused };
            case (null) { false };
        };
        
        let basePair = basePairs.get(curveId);
        let subaccount = curveAccounts.get(curveId);
        
        #ok({
            exists = exists;
            active = active;
            paused = paused;
            basePair = basePair;
            subaccount = subaccount;
            config = config;
        })
    };
    
    public query func getAllCurves() : async [{
        curveId: CurveId;
        basePair: BasePair;
        active: Bool;
        paused: Bool;
        totalDeposited: Nat;
        totalWithdrawn: Nat;
        transactionCount: Nat;
    }] {
        let buffer = Buffer.Buffer<{
            curveId: CurveId;
            basePair: BasePair;
            active: Bool;
            paused: Bool;
            totalDeposited: Nat;
            totalWithdrawn: Nat;
            transactionCount: Nat;
        }>(curveAccounts.size());
        
        for ((curveId, _) in curveAccounts.entries()) {
            let basePair = switch (basePairs.get(curveId)) {
                case (?bp) { bp };
                case (null) { #ckBTC }; // Default
            };
            
            let active = switch (activeCurves.get(curveId)) {
                case (?a) { a };
                case (null) { false };
            };
            
            let config = subaccountConfigs.get(curveId);
            let paused = switch (config) {
                case (?c) { c.paused };
                case (null) { false };
            };
            
            let curveStats = switch (stats.get(curveId)) {
                case (?s) { s };
                case (null) { 
                    { totalDeposited = 0; totalWithdrawn = 0; transactionCount = 0; lastActivity = 0 }
                };
            };
            
            buffer.add({
                curveId = curveId;
                basePair = basePair;
                active = active;
                paused = paused;
                totalDeposited = curveStats.totalDeposited;
                totalWithdrawn = curveStats.totalWithdrawn;
                transactionCount = curveStats.transactionCount;
            });
        };
        
        Buffer.toArray(buffer)
    };
    
    // ===== UPGRADE HOOKS =====
    
    system func preupgrade() {
        curveAccountsEntries := Iter.toArray(curveAccounts.entries());
        basePairsEntries := Iter.toArray(basePairs.entries());
        statsEntries := Iter.toArray(stats.entries());
        activeCurvesEntries := Iter.toArray(activeCurves.entries());
        registrationTimesEntries := Iter.toArray(registrationTimes.entries());
        deactivationTimesEntries := Iter.toArray(deactivationTimes.entries());
        subaccountConfigsEntries := Iter.toArray(subaccountConfigs.entries());
        recentTransactionsEntries := Iter.toArray(recentTransactions.entries());
        
        Debug.print("Pre-upgrade: saved " # Nat.toText(curveAccountsEntries.size()) # " curves");
    };
    
    system func postupgrade() {
        curveAccounts := TrieMap.fromEntries(curveAccountsEntries.vals(), Nat.equal, func(n: Nat) : Nat32 { Nat32.fromNat(n) });
        basePairs := TrieMap.fromEntries(basePairsEntries.vals(), Nat.equal, func(n: Nat) : Nat32 { Nat32.fromNat(n) });
        stats := TrieMap.fromEntries(statsEntries.vals(), Nat.equal, func(n: Nat) : Nat32 { Nat32.fromNat(n) });
        activeCurves := TrieMap.fromEntries(activeCurvesEntries.vals(), Nat.equal, func(n: Nat) : Nat32 { Nat32.fromNat(n) });
        registrationTimes := TrieMap.fromEntries(registrationTimesEntries.vals(), Nat.equal, func(n: Nat) : Nat32 { Nat32.fromNat(n) });
        deactivationTimes := TrieMap.fromEntries(deactivationTimesEntries.vals(), Nat.equal, func(n: Nat) : Nat32 { Nat32.fromNat(n) });
        subaccountConfigs := TrieMap.fromEntries(subaccountConfigsEntries.vals(), Nat.equal, func(n: Nat) : Nat32 { Nat32.fromNat(n) });
        recentTransactions := TrieMap.fromEntries(recentTransactionsEntries.vals(), Nat.equal, func(n: Nat) : Nat32 { Nat32.fromNat(n) });
        
        curveAccountsEntries := [];
        basePairsEntries := [];
        statsEntries := [];
        activeCurvesEntries := [];
        registrationTimesEntries := [];
        deactivationTimesEntries := [];
        subaccountConfigsEntries := [];
        recentTransactionsEntries := [];
        
        Debug.print("Post-upgrade: restored " # Nat.toText(curveAccounts.size()) # " curves");
    };
}