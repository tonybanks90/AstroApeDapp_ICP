/**
 * VAULT CANISTER FOR MULTI-TOKEN BONDING CURVE SYSTEM
 * 
 * This canister manages base currency (ckBTC/ckETH) liquidity for the
 * multi-token bonding curve system. Each registered token receives an
 * isolated subaccount ensuring complete fund separation.
 * 
 * KEY FEATURES:
 * - Isolated subaccounts per token (deterministic generation)
 * - Dual base pair support (ckBTC and ckETH)
 * - Authorization system for bonding curve canisters
 * - Comprehensive transaction audit trail
 * - Emergency controls and pause mechanisms
 * - Per-subaccount configuration and limits
 * - Balance verification before operations
 * 
 * SECURITY MODEL:
 * - Only authorized bonding curves can register tokens
 * - Only authorized bonding curves can move funds
 * - Each token tied to specific bonding curve
 * - Base pair enforcement on all operations
 * - Emergency pause functionality
 * - Per-subaccount withdrawal limits
 * 
 * ARCHITECTURE:
 * Token 1 (ckBTC) → Subaccount [0,0,...,0,1] → Isolated balance
 * Token 2 (ckETH) → Subaccount [0,0,...,0,2] → Isolated balance
 * Token N → Subaccount [0,0,...,N] → Isolated balance
 */

import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Buffer "mo:base/Buffer";
import Debug "mo:base/Debug";
import Hash "mo:base/Hash";
import Int "mo:base/Int";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Nat32 "mo:base/Nat32";
import Nat64 "mo:base/Nat64";
import Option "mo:base/Option";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Time "mo:base/Time";
import TrieMap "mo:base/TrieMap";

shared ({ caller = owner }) actor class Vault() = this {

  // ========================================
  // TYPE DEFINITIONS
  // ========================================

  /**
   * BasePair: Supported base currencies
   */
  public type BasePair = {
    #ckBTC;  // Bitcoin wrapper - 8 decimals (satoshis)
    #ckETH;  // Ethereum wrapper - 18 decimals (wei)
  };

  /**
   * TokenVaultInfo: Complete vault information for a token
   */
  public type TokenVaultInfo = {
    token_id : Nat;
    base_pair : BasePair;
    subaccount : [Nat8];
    bonding_curve : Principal;
    registered_at : Int;
    active : Bool;
  };

  /**
   * TransactionRecord: Audit trail entry
   */
  public type TransactionRecord = {
    token_id : Nat;
    operation : { #pull; #pay; #emergency_withdrawal };
    user : Principal;
    amount : Nat;
    base_pair : BasePair;
    timestamp : Int;
    block_index : ?Nat;
    tx_id : Nat;
  };

  /**
   * SubaccountConfig: Per-subaccount security settings
   */
  public type SubaccountConfig = {
    max_withdrawal_amount : ?Nat;
    paused : Bool;
  };

  // ICRC-1 Account Type
  public type Account = {
    owner : Principal;
    subaccount : ?[Nat8];
  };

  // ICRC-1 Transfer Arguments
  public type TransferArgs = {
    from_subaccount : ?[Nat8];
    to : Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?[Nat8];
    created_at_time : ?Nat64;
  };

  // ICRC-2 Transfer From Arguments
  public type TransferFromArgs = {
    spender_subaccount : ?[Nat8];
    from : Account;
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
    #InsufficientAllowance : { allowance : Nat };
    #TooOld;
    #CreatedInFuture : { ledger_time : Nat64 };
    #TemporarilyUnavailable;
    #Duplicate : { duplicate_of : Nat };
    #GenericError : { error_code : Nat; message : Text };
  };

  public type AllowanceArgs = {
    account : Account;
    spender : Account;
  };

  public type Allowance = {
    allowance : Nat;
    expires_at : ?Nat64;
  };

  // ICRC Ledger Interface
  public type ICRCLedger = actor {
    icrc1_transfer : (TransferArgs) -> async (TransferResult);
    icrc2_transfer_from : (TransferFromArgs) -> async (TransferResult);
    icrc1_balance_of : (Account) -> async (Nat);
    icrc1_fee : () -> async (Nat);
    icrc2_allowance : (AllowanceArgs) -> async (Allowance);
  };

  // ========================================
  // CONSTANTS
  // ========================================

  // Mainnet ledger principals
  private let CKBTC_LEDGER : Principal = Principal.fromText("mxzaz-hqaaa-aaaar-qaada-cai");
  private let CKETH_LEDGER : Principal = Principal.fromText("ss2fx-dyaaa-aaaar-qacoq-cai");

  // Transaction history limits
  private let MAX_HISTORY_SIZE : Nat = 10000;

  // ========================================
  // STATE VARIABLES
  // ========================================

  // Admin principal (set at deployment)
  private let admin : Principal = owner;

  // Authorized bonding curve canisters
  private var authorized_bonding_curves = TrieMap.TrieMap<Principal, Bool>(
    Principal.equal,
    Principal.hash
  );

  // Token ID → Vault Info
  private var token_vaults = TrieMap.TrieMap<Nat, TokenVaultInfo>(
    Nat.equal,
    Hash.hash
  );

  // Token ID → Subaccount Configuration
  private var subaccount_configs = TrieMap.TrieMap<Nat, SubaccountConfig>(
    Nat.equal,
    Hash.hash
  );

  // Transaction counter
  private stable var next_tx_id : Nat = 1;

  // Transaction history (circular buffer)
  private var transaction_history = Buffer.Buffer<TransactionRecord>(MAX_HISTORY_SIZE);

  // Ledger fees (cached)
  private stable var ckbtc_fee : Nat = 10;  // Default 10 satoshis
  private stable var cketh_fee : Nat = 2_000_000_000_000;  // Default 2000 gwei

  // Statistics
  private stable var total_tokens_registered : Nat = 0;
  private stable var total_transactions : Nat = 0;
  private stable var total_volume_deposited : Nat = 0;
  private stable var total_volume_withdrawn : Nat = 0;

  // Emergency pause
  private stable var emergency_paused : Bool = false;

  // Stable storage for upgrades
  private stable var stable_authorized_curves : [(Principal, Bool)] = [];
  private stable var stable_token_vaults : [(Nat, TokenVaultInfo)] = [];
  private stable var stable_subaccount_configs : [(Nat, SubaccountConfig)] = [];
  private stable var stable_transaction_history : [TransactionRecord] = [];
  private stable var stable_next_tx_id : Nat = 1;

  // ========================================
  // HELPER FUNCTIONS
  // ========================================

  /**
   * Get ledger principal for a base pair
   */
  private func getBaseLedger(base_pair : BasePair) : Principal {
    switch (base_pair) {
      case (#ckBTC) CKBTC_LEDGER;
      case (#ckETH) CKETH_LEDGER;
    }
  };

  /**
   * Get cached fee for a base pair
   */
  private func getBaseFee(base_pair : BasePair) : Nat {
    switch (base_pair) {
      case (#ckBTC) ckbtc_fee;
      case (#ckETH) cketh_fee;
    }
  };

  /**
   * Generate deterministic subaccount for a token
   * 
   * Format: 32 bytes total
   * - First 28 bytes: zeros
   * - Last 4 bytes: token_id (big-endian)
   * 
   * Examples:
   * Token 1:   [0,0,0,...,0,0,0,1]
   * Token 256: [0,0,0,...,0,1,0]
   */
  private func generateSubaccount(token_id : Nat) : [Nat8] {
    let bytes = Buffer.Buffer<Nat8>(32);
    
    // Fill first 28 bytes with zeros
    for (_ in Iter.range(0, 27)) {
      bytes.add(0);
    };
    
    // Encode token_id in last 4 bytes (big-endian)
    let id32 = Nat32.fromNat(token_id % (2 ** 32));
    bytes.add(Nat8.fromNat(Nat32.toNat((id32 >> 24) & 0xFF)));
    bytes.add(Nat8.fromNat(Nat32.toNat((id32 >> 16) & 0xFF)));
    bytes.add(Nat8.fromNat(Nat32.toNat((id32 >> 8) & 0xFF)));
    bytes.add(Nat8.fromNat(Nat32.toNat(id32 & 0xFF)));
    
    Buffer.toArray(bytes)
  };

  /**
   * Create vault account for a subaccount (private helper)
   */
  private func createVaultAccount(subaccount : [Nat8]) : Account {
    {
      owner = Principal.fromActor(this);
      subaccount = ?subaccount;
    }
  };

  /**
   * Check if caller is authorized bonding curve
   */
  private func isAuthorized(caller : Principal) : Bool {
    Option.get(authorized_bonding_curves.get(caller), false)
  };

  /**
   * Record transaction in audit trail
   */
  private func recordTransaction(record : TransactionRecord) {
    // Maintain circular buffer
    if (transaction_history.size() >= MAX_HISTORY_SIZE) {
      // Remove oldest transaction
      let temp = Buffer.Buffer<TransactionRecord>(MAX_HISTORY_SIZE);
      for (i in Iter.range(1, transaction_history.size() - 1)) {
        temp.add(transaction_history.get(i));
      };
      transaction_history := temp;
    };
    
    transaction_history.add(record);
    total_transactions += 1;
  };

  /**
   * Get base pair name as text
   */
  private func basePairToText(base_pair : BasePair) : Text {
    switch (base_pair) {
      case (#ckBTC) "ckBTC";
      case (#ckETH) "ckETH";
    }
  };

  // ========================================
  // INITIALIZATION
  // ========================================

  /**
   * Update cached fees from ledgers
   * Should be called periodically to keep fees up to date
   */
  public shared ({ caller }) func updateFees() : async Result.Result<{
    ckbtc_fee : Nat;
    cketh_fee : Nat;
  }, Text> {
    if (caller != admin) {
      return #err("Only admin can update fees");
    };

    // Update ckBTC fee
    try {
      let ckbtc_ledger : ICRCLedger = actor (Principal.toText(CKBTC_LEDGER));
      ckbtc_fee := await ckbtc_ledger.icrc1_fee();
    } catch (error) {
      Debug.print("Warning: Could not fetch ckBTC fee, using cached value");
    };

    // Update ckETH fee
    try {
      let cketh_ledger : ICRCLedger = actor (Principal.toText(CKETH_LEDGER));
      cketh_fee := await cketh_ledger.icrc1_fee();
    } catch (error) {
      Debug.print("Warning: Could not fetch ckETH fee, using cached value");
    };

    #ok({
      ckbtc_fee = ckbtc_fee;
      cketh_fee = cketh_fee;
    })
  };

  // ========================================
  // AUTHORIZATION MANAGEMENT
  // ========================================

  /**
   * Authorize a bonding curve canister
   * 
   * Only authorized canisters can:
   * - Register tokens
   * - Pull funds from users
   * - Pay funds to users
   */
  public shared ({ caller }) func authorizeBondingCurve(
    bonding_curve : Principal
  ) : async Result.Result<Text, Text> {
    if (caller != admin) {
      return #err("Only admin can authorize bonding curves");
    };

    authorized_bonding_curves.put(bonding_curve, true);
    
    Debug.print("Authorized bonding curve: " # Principal.toText(bonding_curve));
    #ok("Bonding curve authorized successfully")
  };

  /**
   * Revoke authorization for a bonding curve
   */
  public shared ({ caller }) func revokeBondingCurve(
    bonding_curve : Principal
  ) : async Result.Result<Text, Text> {
    if (caller != admin) {
      return #err("Only admin can revoke authorization");
    };

    authorized_bonding_curves.delete(bonding_curve);
    
    Debug.print("Revoked bonding curve: " # Principal.toText(bonding_curve));
    #ok("Bonding curve authorization revoked")
  };

  /**
   * Check if a bonding curve is authorized
   */
  public query func isAuthorizedBondingCurve(
    bonding_curve : Principal
  ) : async Bool {
    isAuthorized(bonding_curve)
  };

  // ========================================
  // TOKEN REGISTRATION
  // ========================================

  /**
   * Register a new token with the vault
   * 
   * Called by bonding curve during token registration.
   * Generates unique isolated subaccount for this token's liquidity.
   * 
   * Flow:
   * 1. Validate caller is authorized
   * 2. Check token not already registered
   * 3. Generate deterministic subaccount
   * 4. Store vault info
   * 5. Return subaccount to bonding curve
   * 
   * @param token_id - Unique token identifier from bonding curve
   * @param base_pair - Base currency (ckBTC or ckETH)
   * 
   * Returns: Subaccount bytes for this token
   */
  public shared ({ caller }) func registerToken(
    token_id : Nat,
    base_pair : BasePair
  ) : async Result.Result<[Nat8], Text> {
    
    // Check caller is authorized
    if (not isAuthorized(caller)) {
      return #err("Caller not authorized. Bonding curve must be authorized first.");
    };

    // Validate token_id
    if (token_id == 0) {
      return #err("Invalid token ID. Must be greater than zero.");
    };

    // Check token not already registered
    switch (token_vaults.get(token_id)) {
      case (?_) return #err("Token already registered");
      case null {};
    };

    // Generate unique subaccount
    let subaccount = generateSubaccount(token_id);

    // Create vault info
    let vault_info : TokenVaultInfo = {
      token_id = token_id;
      base_pair = base_pair;
      subaccount = subaccount;
      bonding_curve = caller;
      registered_at = Time.now();
      active = true;
    };

    // Initialize subaccount config with defaults
    let config : SubaccountConfig = {
      max_withdrawal_amount = null;  // No limit by default
      paused = false;
    };

    // Store in state
    token_vaults.put(token_id, vault_info);
    subaccount_configs.put(token_id, config);
    
    total_tokens_registered += 1;

    Debug.print("Registered token " # Nat.toText(token_id) # 
                " with " # basePairToText(base_pair) # 
                " for bonding curve " # Principal.toText(caller));

    #ok(subaccount)
  };

  // ========================================
  // FUND OPERATIONS
  // ========================================

  /**
   * Pull funds from user to vault (for token buys)
   * 
   * Called by bonding curve when user buys tokens.
   * Uses ICRC-2 transfer_from to pull base currency from user.
   * 
   * Requirements:
   * - User must have approved vault via icrc2_approve
   * - Caller must be the registered bonding curve for this token
   * - Base pair must match token's base pair
   * - Subaccount must not be paused
   * 
   * Flow:
   * 1. Validate caller and token
   * 2. Check emergency pause and subaccount pause
   * 3. Verify sufficient allowance
   * 4. Execute transfer_from (user → vault subaccount)
   * 5. Record transaction
   * 6. Update statistics
   * 
   * @param token_id - Which token's liquidity pool
   * @param base_pair - Must match token's base pair
   * @param from - User principal to pull from
   * @param amount - Amount to pull (in smallest units)
   * 
   * Returns: Block index of transfer or error
   */
  public shared ({ caller }) func pullFunds(
    token_id : Nat,
    base_pair : BasePair,
    from : Principal,
    amount : Nat
  ) : async Result.Result<Nat, Text> {
    
    // Check emergency pause
    if (emergency_paused) {
      return #err("Vault is emergency paused");
    };

    // Check caller is authorized
    if (not isAuthorized(caller)) {
      return #err("Caller not authorized");
    };

    // Validate amount
    if (amount == 0) {
      return #err("Amount must be greater than zero");
    };

    // Get vault info
    let vault_info = switch (token_vaults.get(token_id)) {
      case (null) return #err("Token not registered in vault");
      case (?info) info;
    };

    // Check token is active
    if (not vault_info.active) {
      return #err("Token vault is deactivated");
    };

    // Verify base pair matches
    if (vault_info.base_pair != base_pair) {
      return #err("Base pair mismatch. Token uses " # 
                  basePairToText(vault_info.base_pair) # 
                  " but received " # basePairToText(base_pair));
    };

    // Verify caller is the registered bonding curve
    if (vault_info.bonding_curve != caller) {
      return #err("Only the registered bonding curve can pull funds for this token");
    };

    // Check subaccount not paused
    let config = switch (subaccount_configs.get(token_id)) {
      case (?c) c;
      case null {
        { max_withdrawal_amount = null; paused = false }
      };
    };

    if (config.paused) {
      return #err("Token subaccount is paused");
    };

    // Get ledger and fee
    let ledger_principal = getBaseLedger(base_pair);
    let fee = getBaseFee(base_pair);
    let ledger : ICRCLedger = actor (Principal.toText(ledger_principal));

    // Verify user has sufficient allowance
    let user_account = { owner = from; subaccount = null };
    let vault_account = createVaultAccount(vault_info.subaccount);
    let required_amount = amount + fee;

    let allowance_check = await ledger.icrc2_allowance({
      account = user_account;
      spender = { owner = Principal.fromActor(this); subaccount = null };
    });

    if (allowance_check.allowance < required_amount) {
      return #err("Insufficient allowance. User must approve " # 
                  Nat.toText(required_amount) # " " # 
                  basePairToText(base_pair) # 
                  " (amount + fee). Current allowance: " # 
                  Nat.toText(allowance_check.allowance));
    };

    // Execute transfer_from
    let timestamp = Nat64.fromNat(Int.abs(Time.now()));
    let transfer_args : TransferFromArgs = {
      spender_subaccount = null;
      from = user_account;
      to = vault_account;
      amount = amount;
      fee = ?fee;
      memo = ?Blob.toArray(Text.encodeUtf8("BC buy - pull funds"));
      created_at_time = ?timestamp;
    };

    switch (await ledger.icrc2_transfer_from(transfer_args)) {
      case (#Err(error)) {
        let error_msg = switch (error) {
          case (#InsufficientFunds({ balance })) {
            "Insufficient funds. Balance: " # Nat.toText(balance) # 
            ", Required: " # Nat.toText(required_amount)
          };
          case (#InsufficientAllowance({ allowance })) {
            "Insufficient allowance: " # Nat.toText(allowance)
          };
          case (#BadFee({ expected_fee })) {
            "Incorrect fee. Expected: " # Nat.toText(expected_fee)
          };
          case (#TooOld) "Transaction too old";
          case (#CreatedInFuture(_)) "Transaction created in future";
          case (#TemporarilyUnavailable) "Ledger temporarily unavailable";
          case (#Duplicate({ duplicate_of })) {
            "Duplicate transaction: " # Nat.toText(duplicate_of)
          };
          case (#GenericError({ error_code; message })) {
            "Error " # Nat.toText(error_code) # ": " # message
          };
          case _ "Transfer failed";
        };
        #err(error_msg)
      };
      case (#Ok(block_index)) {
        // Record transaction
        recordTransaction({
          token_id = token_id;
          operation = #pull;
          user = from;
          amount = amount;
          base_pair = base_pair;
          timestamp = Time.now();
          block_index = ?block_index;
          tx_id = next_tx_id;
        });
        next_tx_id += 1;

        // Update statistics
        total_volume_deposited += amount;

        Debug.print("Pulled " # Nat.toText(amount) # " " # 
                    basePairToText(base_pair) # 
                    " from " # Principal.toText(from) # 
                    " to token " # Nat.toText(token_id) # 
                    " vault (block: " # Nat.toText(block_index) # ")");

        #ok(block_index)
      };
    }
  };

  /**
   * Pay funds from vault to user (for token sells and withdrawals)
   * 
   * Called by bonding curve when:
   * - User sells tokens back to curve
   * - Admin withdraws protocol fees
   * - Rollback needed after failed transaction
   * 
   * Requirements:
   * - Caller must be the registered bonding curve for this token
   * - Base pair must match token's base pair
   * - Vault must have sufficient balance
   * - Subaccount must not be paused
   * - Amount must not exceed withdrawal limit (if set)
   * 
   * Flow:
   * 1. Validate caller and token
   * 2. Check emergency pause, subaccount pause, withdrawal limits
   * 3. Verify vault has sufficient balance
   * 4. Execute transfer (vault subaccount → user)
   * 5. Record transaction
   * 6. Update statistics
   * 
   * @param token_id - Which token's liquidity pool
   * @param base_pair - Must match token's base pair
   * @param to - Recipient principal
   * @param amount - Amount to pay (in smallest units)
   * 
   * Returns: Block index of transfer or error
   */
  public shared ({ caller }) func payFunds(
    token_id : Nat,
    base_pair : BasePair,
    to : Principal,
    amount : Nat
  ) : async Result.Result<Nat, Text> {
    
    // Check emergency pause
    if (emergency_paused) {
      return #err("Vault is emergency paused");
    };

    // Check caller is authorized
    if (not isAuthorized(caller)) {
      return #err("Caller not authorized");
    };

    // Validate amount
    if (amount == 0) {
      return #err("Amount must be greater than zero");
    };

    // Get vault info
    let vault_info = switch (token_vaults.get(token_id)) {
      case (null) return #err("Token not registered in vault");
      case (?info) info;
    };

    // Check token is active
    if (not vault_info.active) {
      return #err("Token vault is deactivated");
    };

    // Verify base pair matches
    if (vault_info.base_pair != base_pair) {
      return #err("Base pair mismatch. Token uses " # 
                  basePairToText(vault_info.base_pair));
    };

    // Verify caller is the registered bonding curve
    if (vault_info.bonding_curve != caller) {
      return #err("Only the registered bonding curve can pay funds for this token");
    };

    // Check subaccount configuration
    let config = switch (subaccount_configs.get(token_id)) {
      case (?c) c;
      case null {
        { max_withdrawal_amount = null; paused = false }
      };
    };

    if (config.paused) {
      return #err("Token subaccount is paused");
    };

    // Check withdrawal limit
    switch (config.max_withdrawal_amount) {
      case (?max_amount) {
        if (amount > max_amount) {
          return #err("Amount exceeds withdrawal limit: " # 
                      Nat.toText(max_amount) # " " # 
                      basePairToText(base_pair));
        };
      };
      case null {};
    };

    // Get ledger and fee
    let ledger_principal = getBaseLedger(base_pair);
    let fee = getBaseFee(base_pair);
    let ledger : ICRCLedger = actor (Principal.toText(ledger_principal));

    // Check vault has sufficient balance
    let vault_account = createVaultAccount(vault_info.subaccount);
    let balance = await ledger.icrc1_balance_of(vault_account);
    let required_amount = amount + fee;

    if (balance < required_amount) {
      return #err("Insufficient vault balance. Available: " # 
                  Nat.toText(balance) # " " # 
                  basePairToText(base_pair) # 
                  ", Required: " # Nat.toText(required_amount) # 
                  " (amount + fee)");
    };

    // Execute transfer
    let timestamp = Nat64.fromNat(Int.abs(Time.now()));
    let recipient_account = { owner = to; subaccount = null };
    let transfer_args : TransferArgs = {
      from_subaccount = ?vault_info.subaccount;
      to = recipient_account;
      amount = amount;
      fee = ?fee;
      memo = ?Blob.toArray(Text.encodeUtf8("BC sell - pay funds"));
      created_at_time = ?timestamp;
    };

    switch (await ledger.icrc1_transfer(transfer_args)) {
      case (#Err(error)) {
        let error_msg = switch (error) {
          case (#InsufficientFunds({ balance })) {
            "Insufficient funds: " # Nat.toText(balance)
          };
          case (#BadFee({ expected_fee })) {
            "Incorrect fee. Expected: " # Nat.toText(expected_fee)
          };
          case _ "Transfer failed";
        };
        #err(error_msg)
      };
      case (#Ok(block_index)) {
        // Record transaction
        recordTransaction({
          token_id = token_id;
          operation = #pay;
          user = to;
          amount = amount;
          base_pair = base_pair;
          timestamp = Time.now();
          block_index = ?block_index;
          tx_id = next_tx_id;
        });
        next_tx_id += 1;

        // Update statistics
        total_volume_withdrawn += amount;

        Debug.print("Paid " # Nat.toText(amount) # " " # 
                    basePairToText(base_pair) # 
                    " from token " # Nat.toText(token_id) # 
                    " vault to " # Principal.toText(to) # 
                    " (block: " # Nat.toText(block_index) # ")");

        #ok(block_index)
      };
    }
  };

  // ========================================
  // QUERY FUNCTIONS
  // ========================================

  /**
   * Get current balance for a token's vault (async)
   * 
   * Queries the ledger for the actual current balance.
   */
  public shared func getBalanceAsync(
    token_id : Nat,
    base_pair : BasePair
  ) : async Result.Result<Nat, Text> {
    
    let vault_info = switch (token_vaults.get(token_id)) {
      case (null) return #err("Token not registered");
      case (?info) info;
    };

    if (vault_info.base_pair != base_pair) {
      return #err("Base pair mismatch");
    };

    let ledger : ICRCLedger = actor (Principal.toText(getBaseLedger(base_pair)));
    let balance = await ledger.icrc1_balance_of(createVaultAccount(vault_info.subaccount));

    #ok(balance)
  };

  /**
   * Get vault information for a token
   */
  public query func getTokenVaultInfo(token_id : Nat) : async ?TokenVaultInfo {
    token_vaults.get(token_id)
  };

  /**
   * Get all registered token vaults
   */
  public query func getAllTokenVaults() : async [TokenVaultInfo] {
    Iter.toArray(token_vaults.vals())
  };

  /**
   * Get subaccount configuration for a token
   */
  public query func getSubaccountConfig(token_id : Nat) : async ?SubaccountConfig {
    subaccount_configs.get(token_id)
  };

  /**
   * Get transaction history for a specific token
   */
  public query func getTransactionHistory(
    token_id : Nat,
    limit : Nat
  ) : async [TransactionRecord] {
    let filtered = Buffer.Buffer<TransactionRecord>(0);
    
    // Iterate backwards (newest first)
    var count = 0;
    var i = transaction_history.size();
    while (i > 0 and count < limit) {
      i -= 1;
      let tx = transaction_history.get(i);
      if (tx.token_id == token_id) {
        filtered.add(tx);
        count += 1;
      };
    };
    
    Buffer.toArray(filtered)
  };

  /**
   * Get recent transaction history (all tokens)
   */
  public query func getAllTransactionHistory(limit : Nat) : async [TransactionRecord] {
    let size = transaction_history.size();
    let start = if (size > limit) { size - limit } else { 0 };
    
    let result = Buffer.Buffer<TransactionRecord>(limit);
    for (i in Iter.range(start, size - 1)) {
      result.add(transaction_history.get(i));
    };
    
    Buffer.toArray(result)
  };

  /**
   * Get subaccount bytes for a token
   */
  public query func getSubaccount(token_id : Nat) : async ?[Nat8] {
    switch (token_vaults.get(token_id)) {
      case (?info) ?info.subaccount;
      case null null;
    }
  };

  /**
   * Get vault account (principal + subaccount) for a token
   */
  public query func getVaultAccount(token_id : Nat) : async Result.Result<Account, Text> {
    switch (token_vaults.get(token_id)) {
      case (null) #err("Token not registered");
      case (?info) {
        #ok({
          owner = Principal.fromActor(this);
          subaccount = ?info.subaccount;
        })
      };
    }
  };

  /**
   * Get comprehensive vault statistics
   */
  public query func getVaultStats() : async {
    total_tokens_registered : Nat;
    total_transactions : Nat;
    total_volume_deposited : Nat;
    total_volume_withdrawn : Nat;
    total_authorized_curves : Nat;
    tokens_by_base_pair : {
      ckBTC : Nat;
      ckETH : Nat;
    };
    emergency_paused : Bool;
  } {
    var ckbtc_count = 0;
    var cketh_count = 0;
    
    for (info in token_vaults.vals()) {
      switch (info.base_pair) {
        case (#ckBTC) ckbtc_count += 1;
        case (#ckETH) cketh_count += 1;
      };
    };

    {
      total_tokens_registered = total_tokens_registered;
      total_transactions = total_transactions;
      total_volume_deposited = total_volume_deposited;
      total_volume_withdrawn = total_volume_withdrawn;
      total_authorized_curves = authorized_bonding_curves.size();
      tokens_by_base_pair = {
        ckBTC = ckbtc_count;
        ckETH = cketh_count;
      };
      emergency_paused = emergency_paused;
    }
  };

  /**
   * Get current fee configuration
   */
  public query func getFeeConfig() : async {
    ckbtc_fee : Nat;
    cketh_fee : Nat;
    ckbtc_ledger : Principal;
    cketh_ledger : Principal;
  } {
    {
      ckbtc_fee = ckbtc_fee;
      cketh_fee = cketh_fee;
      ckbtc_ledger = CKBTC_LEDGER;
      cketh_ledger = CKETH_LEDGER;
    }
  };

  /**
   * Check user's allowance for vault
   */
  public shared func checkUserAllowance(
    user : Principal,
    base_pair : BasePair,
    amount : Nat
  ) : async Result.Result<{
    allowance : Nat;
    sufficient : Bool;
    required : Nat;
  }, Text> {
    
    let ledger : ICRCLedger = actor (Principal.toText(getBaseLedger(base_pair)));
    let fee = getBaseFee(base_pair);
    let required = amount + fee;

    try {
      let allowance_result = await ledger.icrc2_allowance({
        account = { owner = user; subaccount = null };
        spender = { owner = Principal.fromActor(this); subaccount = null };
      });

      #ok({
        allowance = allowance_result.allowance;
        sufficient = allowance_result.allowance >= required;
        required = required;
      })
    } catch (error) {
      #err("Failed to check allowance")
    }
  };

  // ========================================
  // ADMIN - SUBACCOUNT CONFIGURATION
  // ========================================

  /**
   * Update subaccount configuration
   */
  public shared ({ caller }) func updateSubaccountConfig(
    token_id : Nat,
    max_withdrawal_amount : ?Nat,
    paused : ?Bool
  ) : async Result.Result<Text, Text> {
    if (caller != admin) {
      return #err("Only admin can update subaccount configuration");
    };

    // Verify token exists
    switch (token_vaults.get(token_id)) {
      case (null) return #err("Token not registered");
      case (?_) {};
    };

    let current_config = switch (subaccount_configs.get(token_id)) {
      case (?c) c;
      case null {
        { max_withdrawal_amount = null; paused = false }
      };
    };

    let new_config : SubaccountConfig = {
      max_withdrawal_amount = switch (max_withdrawal_amount) {
        case (?amount) ?amount;
        case null current_config.max_withdrawal_amount;
      };
      paused = switch (paused) {
        case (?p) p;
        case null current_config.paused;
      };
    };

    subaccount_configs.put(token_id, new_config);

    Debug.print("Updated config for token " # Nat.toText(token_id));
    #ok("Subaccount configuration updated")
  };

  /**
   * Set withdrawal limit for a token's subaccount
   */
  public shared ({ caller }) func setWithdrawalLimit(
    token_id : Nat,
    max_amount : ?Nat
  ) : async Result.Result<Text, Text> {
    if (caller != admin) {
      return #err("Only admin can set withdrawal limits");
    };

    switch (token_vaults.get(token_id)) {
      case (null) return #err("Token not registered");
      case (?_) {};
    };

    let current_config = switch (subaccount_configs.get(token_id)) {
      case (?c) c;
      case null {
        { max_withdrawal_amount = null; paused = false }
      };
    };

    subaccount_configs.put(token_id, {
      max_withdrawal_amount = max_amount;
      paused = current_config.paused;
    });

    let limit_text = switch (max_amount) {
      case (?amt) Nat.toText(amt);
      case null "unlimited";
    };

    Debug.print("Set withdrawal limit for token " # Nat.toText(token_id) # 
                ": " # limit_text);
    #ok("Withdrawal limit updated")
  };

  /**
   * Pause a specific token's subaccount
   */
  public shared ({ caller }) func pauseSubaccount(
    token_id : Nat
  ) : async Result.Result<Text, Text> {
    if (caller != admin) {
      return #err("Only admin can pause subaccounts");
    };

    switch (token_vaults.get(token_id)) {
      case (null) return #err("Token not registered");
      case (?_) {};
    };

    let current_config = switch (subaccount_configs.get(token_id)) {
      case (?c) c;
      case null {
        { max_withdrawal_amount = null; paused = false }
      };
    };

    subaccount_configs.put(token_id, {
      max_withdrawal_amount = current_config.max_withdrawal_amount;
      paused = true;
    });

    Debug.print("Paused subaccount for token " # Nat.toText(token_id));
    #ok("Subaccount paused")
  };

  /**
   * Unpause a specific token's subaccount
   */
  public shared ({ caller }) func unpauseSubaccount(
    token_id : Nat
  ) : async Result.Result<Text, Text> {
    if (caller != admin) {
      return #err("Only admin can unpause subaccounts");
    };

    switch (token_vaults.get(token_id)) {
      case (null) return #err("Token not registered");
      case (?_) {};
    };

    let current_config = switch (subaccount_configs.get(token_id)) {
      case (?c) c;
      case null {
        { max_withdrawal_amount = null; paused = false }
      };
    };

    subaccount_configs.put(token_id, {
      max_withdrawal_amount = current_config.max_withdrawal_amount;
      paused = false;
    });

    Debug.print("Unpaused subaccount for token " # Nat.toText(token_id));
    #ok("Subaccount unpaused")
  };

  /**
   * Deactivate a token vault
   */
  public shared ({ caller }) func deactivateToken(
    token_id : Nat
  ) : async Result.Result<Text, Text> {
    if (caller != admin) {
      return #err("Only admin can deactivate tokens");
    };

    let vault_info = switch (token_vaults.get(token_id)) {
      case (null) return #err("Token not registered");
      case (?info) info;
    };

    let updated_info : TokenVaultInfo = {
      token_id = vault_info.token_id;
      base_pair = vault_info.base_pair;
      subaccount = vault_info.subaccount;
      bonding_curve = vault_info.bonding_curve;
      registered_at = vault_info.registered_at;
      active = false;
    };

    token_vaults.put(token_id, updated_info);

    Debug.print("Deactivated token " # Nat.toText(token_id));
    #ok("Token vault deactivated")
  };

  /**
   * Reactivate a token vault
   */
  public shared ({ caller }) func reactivateToken(
    token_id : Nat
  ) : async Result.Result<Text, Text> {
    if (caller != admin) {
      return #err("Only admin can reactivate tokens");
    };

    let vault_info = switch (token_vaults.get(token_id)) {
      case (null) return #err("Token not registered");
      case (?info) info;
    };

    let updated_info : TokenVaultInfo = {
      token_id = vault_info.token_id;
      base_pair = vault_info.base_pair;
      subaccount = vault_info.subaccount;
      bonding_curve = vault_info.bonding_curve;
      registered_at = vault_info.registered_at;
      active = true;
    };

    token_vaults.put(token_id, updated_info);

    Debug.print("Reactivated token " # Nat.toText(token_id));
    #ok("Token vault reactivated")
  };

  // ========================================
  // EMERGENCY CONTROLS
  // ========================================

  /**
   * Emergency pause entire vault
   * Stops all pullFunds and payFunds operations
   */
  public shared ({ caller }) func emergencyPause() : async Result.Result<Text, Text> {
    if (caller != admin) {
      return #err("Only admin can emergency pause");
    };

    emergency_paused := true;
    Debug.print("⚠️  EMERGENCY PAUSE ACTIVATED ⚠️");
    #ok("Vault emergency paused")
  };

  /**
   * Unpause vault after emergency
   */
  public shared ({ caller }) func emergencyUnpause() : async Result.Result<Text, Text> {
    if (caller != admin) {
      return #err("Only admin can emergency unpause");
    };

    emergency_paused := false;
    Debug.print("Emergency pause deactivated");
    #ok("Vault emergency unpaused")
  };

  /**
   * Emergency withdrawal
   * 
   * Allows admin to recover funds in case of emergency.
   * Should only be used if bonding curve is compromised.
   */
  public shared ({ caller }) func emergencyWithdraw(
    token_id : Nat,
    base_pair : BasePair,
    to : Principal,
    amount : Nat
  ) : async Result.Result<Nat, Text> {
    if (caller != admin) {
      return #err("Only admin can perform emergency withdrawal");
    };

    let vault_info = switch (token_vaults.get(token_id)) {
      case (null) return #err("Token not registered");
      case (?info) info;
    };

    if (vault_info.base_pair != base_pair) {
      return #err("Base pair mismatch");
    };

    // Get ledger and fee
    let ledger : ICRCLedger = actor (Principal.toText(getBaseLedger(base_pair)));
    let fee = getBaseFee(base_pair);

    // Check balance
    let balance = await ledger.icrc1_balance_of(createVaultAccount(vault_info.subaccount));
    let required = amount + fee;

    if (balance < required) {
      return #err("Insufficient balance. Available: " # Nat.toText(balance));
    };

    // Execute transfer
    let timestamp = Nat64.fromNat(Int.abs(Time.now()));
    let transfer_args : TransferArgs = {
      from_subaccount = ?vault_info.subaccount;
      to = { owner = to; subaccount = null };
      amount = amount;
      fee = ?fee;
      memo = ?Blob.toArray(Text.encodeUtf8("Emergency withdrawal"));
      created_at_time = ?timestamp;
    };

    switch (await ledger.icrc1_transfer(transfer_args)) {
      case (#Err(e)) #err("Transfer failed: " # debug_show(e));
      case (#Ok(block_index)) {
        // Record transaction
        recordTransaction({
          token_id = token_id;
          operation = #emergency_withdrawal;
          user = to;
          amount = amount;
          base_pair = base_pair;
          timestamp = Time.now();
          block_index = ?block_index;
          tx_id = next_tx_id;
        });
        next_tx_id += 1;

        Debug.print("⚠️  Emergency withdrawal: " # Nat.toText(amount) # 
                    " " # basePairToText(base_pair) # 
                    " from token " # Nat.toText(token_id) # 
                    " to " # Principal.toText(to));

        #ok(block_index)
      };
    }
  };

  // ========================================
  // ADMIN UTILITIES
  // ========================================

  /**
   * Get admin principal
   */
  public query func getAdmin() : async Principal {
    admin
  };

  /**
   * Get all authorized bonding curves
   */
  public query func getAuthorizedBondingCurves() : async [Principal] {
    let buffer = Buffer.Buffer<Principal>(0);
    for ((principal, authorized) in authorized_bonding_curves.entries()) {
      if (authorized) {
        buffer.add(principal);
      };
    };
    Buffer.toArray(buffer)
  };

  /**
   * Validate token vault integrity
   */
  public query func validateToken(token_id : Nat) : async Result.Result<{
    exists : Bool;
    active : Bool;
    paused : Bool;
    base_pair : BasePair;
    subaccount : [Nat8];
    bonding_curve : Principal;
    config : SubaccountConfig;
  }, Text> {
    
    let vault_info = switch (token_vaults.get(token_id)) {
      case (null) return #err("Token not registered");
      case (?info) info;
    };

    let config = switch (subaccount_configs.get(token_id)) {
      case (?c) c;
      case null {
        { max_withdrawal_amount = null; paused = false }
      };
    };

    #ok({
      exists = true;
      active = vault_info.active;
      paused = config.paused;
      base_pair = vault_info.base_pair;
      subaccount = vault_info.subaccount;
      bonding_curve = vault_info.bonding_curve;
      config = config;
    })
  };

  /**
   * Get all tokens by base pair
   */
  public query func getTokensByBasePair(base_pair : BasePair) : async [TokenVaultInfo] {
    let buffer = Buffer.Buffer<TokenVaultInfo>(0);
    for (info in token_vaults.vals()) {
      if (info.base_pair == base_pair) {
        buffer.add(info);
      };
    };
    Buffer.toArray(buffer)
  };

  /**
   * Get active tokens
   */
  public query func getActiveTokens() : async [TokenVaultInfo] {
    let buffer = Buffer.Buffer<TokenVaultInfo>(0);
    for (info in token_vaults.vals()) {
      if (info.active) {
        buffer.add(info);
      };
    };
    Buffer.toArray(buffer)
  };

  /**
   * Get inactive tokens
   */
  public query func getInactiveTokens() : async [TokenVaultInfo] {
    let buffer = Buffer.Buffer<TokenVaultInfo>(0);
    for (info in token_vaults.vals()) {
      if (not info.active) {
        buffer.add(info);
      };
    };
    Buffer.toArray(buffer)
  };

  // ========================================
  // SYSTEM FUNCTIONS (Upgrade Handling)
  // ========================================

  /**
   * Pre-upgrade hook: Save state to stable memory
   */
  system func preupgrade() {
    stable_authorized_curves := Iter.toArray(authorized_bonding_curves.entries());
    stable_token_vaults := Iter.toArray(token_vaults.entries());
    stable_subaccount_configs := Iter.toArray(subaccount_configs.entries());
    stable_transaction_history := Buffer.toArray(transaction_history);
    stable_next_tx_id := next_tx_id;

    Debug.print("Pre-upgrade: Saved " # 
                Nat.toText(stable_token_vaults.size()) # " token vaults, " #
                Nat.toText(stable_transaction_history.size()) # " transactions");
  };

  /**
   * Post-upgrade hook: Restore state from stable memory
   */
  system func postupgrade() {
    authorized_bonding_curves := TrieMap.fromEntries<Principal, Bool>(
      stable_authorized_curves.vals(),
      Principal.equal,
      Principal.hash
    );

    token_vaults := TrieMap.fromEntries<Nat, TokenVaultInfo>(
      stable_token_vaults.vals(),
      Nat.equal,
      Hash.hash
    );

    subaccount_configs := TrieMap.fromEntries<Nat, SubaccountConfig>(
      stable_subaccount_configs.vals(),
      Nat.equal,
      Hash.hash
    );

    transaction_history := Buffer.Buffer<TransactionRecord>(MAX_HISTORY_SIZE);
    for (tx in stable_transaction_history.vals()) {
      transaction_history.add(tx);
    };

    next_tx_id := stable_next_tx_id;

    // Clear stable storage
    stable_authorized_curves := [];
    stable_token_vaults := [];
    stable_subaccount_configs := [];
    stable_transaction_history := [];

    Debug.print("Post-upgrade: Restored " # 
                Nat.toText(token_vaults.size()) # " token vaults, " #
                Nat.toText(transaction_history.size()) # " transactions");
  };
}