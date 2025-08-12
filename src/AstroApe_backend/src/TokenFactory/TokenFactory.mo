import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Blob "mo:base/Blob";
import Debug "mo:base/Debug";
import List "mo:base/List";
import Error "mo:base/Error";
import Nat16 "mo:base/Nat16";
import Nat64 "mo:base/Nat64";
import Time "mo:base/Time";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Option "mo:base/Option";
import Array "mo:base/Array";

actor TokenFactory {
  // ICRC-2 Standard Types
  public type Account = {
    owner : Principal;
    subaccount : ?[Nat8];
  };

  public type Value = {
    #Nat : Nat;
    #Int : Int;
    #Text : Text;
    #Blob : Blob;
  };

  public type MetadataValue = {
    #Nat : Nat;
    #Int : Int;
    #Text : Text;
    #Blob : Blob;
  };

  // Logo types for ICRC-2 metadata
  public type LogoData = {
    #ImageUrl : Text;
    #ImageBlob : Blob;
  };

  public type TokenMetadata = {
    name : Text;
    symbol : Text;
    decimals : Nat8;
    fee : Nat;
    logo : LogoData;
    description : Text;
    website : ?Text;
    telegram : ?Text;
    twitter : ?Text;
    created_at : Int;
    total_supply : Nat;
    minting_account : Account;
  };

  public type InitArgs = {
    token_symbol : Text;
    token_name : Text;
    decimals : ?Nat8;
    minting_account : Account;
    transfer_fee : Nat;
    metadata : [(Text, MetadataValue)];
    feature_flags : ?{ icrc2 : Bool };
    initial_balances : [(Account, Nat)];
    archive_options : {
      num_blocks_to_archive : Nat64;
      trigger_threshold : Nat64;
      controller_id : Principal;
      cycles_for_archive_creation : ?Nat64;
    };
  };

  public type LedgerArgs = {
    #Init : InitArgs;
  };

  // ICRC-2 Transfer types for testing
  public type TransferArgs = {
    from_subaccount : ?[Nat8];
    to : Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?Blob;
    created_at_time : ?Nat64;
  };

  public type TransferFromArgs = {
    spender_subaccount : ?[Nat8];
    from : Account;
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
    #TemporarilyUnavailable;
    #Duplicate : { duplicate_of : Nat };
    #GenericError : { error_code : Nat; message : Text };
  };

  public type ApprovalArgs = {
    from_subaccount : ?[Nat8];
    spender : Account;
    amount : Nat;
    expected_allowance : ?Nat;
    expires_at : ?Nat64;
    fee : ?Nat;
    memo : ?Blob;
    created_at_time : ?Nat64;
  };

  public type AllowanceArgs = {
    account : Account;
    spender : Account;
  };

  public type Allowance = {
    allowance : Nat;
    expires_at : ?Nat64;
  };

  // Token interface for testing
  public type TokenInterface = actor {
    // ICRC-1 Standard methods
    icrc1_name : query () -> async Text;
    icrc1_symbol : query () -> async Text;
    icrc1_decimals : query () -> async Nat8;
    icrc1_fee : query () -> async Nat;
    icrc1_metadata : query () -> async [(Text, Value)];
    icrc1_total_supply : query () -> async Nat;
    icrc1_minting_account : query () -> async ?Account;
    icrc1_balance_of : query (Account) -> async Nat;
    icrc1_transfer : (TransferArgs) -> async Result.Result<Nat, TransferError>;
    icrc1_supported_standards : query () -> async [{ name : Text; url : Text }];

    // ICRC-2 Standard methods
    icrc2_approve : (ApprovalArgs) -> async Result.Result<Nat, TransferError>;
    icrc2_allowance : query (AllowanceArgs) -> async Allowance;
    icrc2_transfer_from : (TransferFromArgs) -> async Result.Result<Nat, TransferError>;
  };

  // Constants
  private let FIXED_SUPPLY : Nat = 1_000_000_000; // 1 Billion tokens
  private let DEFAULT_DECIMALS : Nat8 = 8;
  private let DEFAULT_FEE : Nat = 10_000;

  // Stable storage
  private stable var tokens : List.List<Principal> = List.nil();
  private stable var createdCanisters : List.List<Principal> = List.nil();
  private stable var wasm_module : ?Blob = null;
  private stable var tokenMetadataEntries : [(Principal, TokenMetadata)] = [];
  
  // Runtime storage - explicitly marked as transient
  private transient var tokenMetadata = HashMap.HashMap<Principal, TokenMetadata>(0, Principal.equal, Principal.hash);

  // Management canister interface - explicitly marked as transient
  private transient let mgmt = actor "aaaaa-aa" : actor {
    create_canister : shared { settings : ?{ controllers : [Principal] } } -> async { canister_id : Principal };
    install_code : shared {
      canister_id : Principal;
      wasm_module : Blob;
      arg : Blob;
      mode : { #install; #reinstall; #upgrade };
    } -> async ();
  };

  // HTTP outcalls interface - explicitly marked as transient
  private transient let http = actor "aaaaa-aa" : actor {
    http_request : shared {
      url : Text;
      max_response_bytes : ?Nat64;
      headers : [{ name : Text; value : Text }];
      body : ?[Nat8];
      method : { #get; #post; #head };
      transform : ?{
        function : shared ({ response : { body: Blob; headers: [{ name : Text; value : Text }]; status_code : Nat16 } }) -> async { body: Blob; headers: [{ name : Text; value : Text }]; status_code : Nat16 };
        context : Blob;
      };
    } -> async {
      body : Blob;
      headers : [{ name : Text; value : Text }];
      status_code : Nat16;
    };
  };

  private transient let icrc1_wasm_url = "https://download.dfinity.systems/ic/4833f30d3b5afd84a385dfb146581580285d8a7e/canisters/ic-icrc1-ledger.wasm.gz";

  // Initialize from stable storage
  system func preupgrade() {
    tokenMetadataEntries := Iter.toArray(tokenMetadata.entries());
  };

  system func postupgrade() {
    tokenMetadata := HashMap.fromIter<Principal, TokenMetadata>(
      tokenMetadataEntries.vals(), 
      tokenMetadataEntries.size(), 
      Principal.equal, 
      Principal.hash
    );
    tokenMetadataEntries := [];
  };

  // Helper function to create ICRC-2 compliant metadata
  // Note: Standard fields like icrc1:name, icrc1:symbol, icrc1:decimals, icrc1:fee
  // are automatically handled by the ledger and should NOT be included in metadata
  func createIcrc2Metadata(
    logo : LogoData,
    description : Text,
    website : ?Text,
    telegram : ?Text,
    twitter : ?Text
  ) : [(Text, MetadataValue)] {
    var metadata : [(Text, MetadataValue)] = [
      ("icrc1:description", #Text(description)),
    ];

    // Add logo based on type
    switch (logo) {
      case (#ImageUrl(url)) {
        metadata := Array.append(metadata, [("icrc1:logo", #Text(url))]);
      };
      case (#ImageBlob(blob)) {
        metadata := Array.append(metadata, [("icrc1:logo", #Blob(blob))]);
      };
    };

    // Add optional social media links
    switch (website) {
      case (?site) {
        metadata := Array.append(metadata, [("icrc1:website", #Text(site))]);
      };
      case null {};
    };

    switch (telegram) {
      case (?tg) {
        metadata := Array.append(metadata, [("icrc1:telegram", #Text(tg))]);
      };
      case null {};
    };

    switch (twitter) {
      case (?tw) {
        metadata := Array.append(metadata, [("icrc1:twitter", #Text(tw))]);
      };
      case null {};
    };

    metadata
  };

  func fetch_wasm(url : Text) : async Result.Result<Blob, Text> {
    try {
      Debug.print("Fetching WASM from " # url);
      let response = await (with cycles = 30_000_000_000) http.http_request<system>({
        url = url;
        max_response_bytes = null;
        headers = [];
        body = null;
        method = #get;
        transform = null;
      });
      if (response.status_code == 200) {
        Debug.print("Successfully fetched WASM from " # url);
        #ok(response.body)
      } else {
        Debug.print("HTTP error: " # Nat16.toText(response.status_code));
        #err("HTTP error: " # Nat16.toText(response.status_code))
      }
    } catch (e) {
      let errMsg = "Failed to fetch WASM: " # Error.message(e);
      Debug.print(errMsg);
      #err(errMsg)
    }
  };

  public shared func uploadWasm(wasm_blob : Blob) : async Result.Result<Text, Text> {
    Debug.print("WASM blob received. Saving to stable memory...");
    wasm_module := ?wasm_blob;
    Debug.print("WASM blob saved successfully in stable memory.");
    return #ok("WASM module uploaded and saved successfully in stable memory.");
  };

  public shared func save_wasm() : async Result.Result<Text, Text> {
    if (wasm_module != null) {
      return #ok("WASM already fetched and saved in stable memory.");
    };
    Debug.print("Fetching ICRC-1 Ledger WASM...");
    let icrc1_wasm_result = await fetch_wasm(icrc1_wasm_url);
    switch (icrc1_wasm_result) {
      case (#err(errMsg)) return #err(errMsg);
      case (#ok(icrc1_wasm)) {
        wasm_module := ?icrc1_wasm;
        Debug.print("WASM fetched and saved successfully in stable memory.");
        return #ok("WASM fetched and saved successfully in stable memory.");
      }
    }
  };

  public shared func checkAndSaveWasm() : async Result.Result<Text, Text> {
    if (wasm_module != null) {
      return #ok("WASM is already saved in stable memory.");
    } else {
      return await save_wasm();
    }
  };

  // Enhanced token creation with ICRC-2 support and fixed supply
  public shared({ caller }) func createIcrc2Token(
    name : Text,
    symbol : Text,
    logo : LogoData,
    description : Text,
    website : ?Text,
    telegram : ?Text,
    twitter : ?Text
  ) : async Result.Result<Principal, Text> {
    try {
      // Validate required fields
      if (Text.size(name) == 0) {
        return #err("Token name is required");
      };
      if (Text.size(symbol) == 0) {
        return #err("Token symbol is required");
      };
      if (Text.size(description) == 0) {
        return #err("Token description is required");
      };

      if (wasm_module == null) {
        return #err("WASM module not available. Please upload or fetch it first using uploadWasm() or save_wasm().");
      };

      let self = Principal.fromActor(TokenFactory);

      Debug.print("Creating new ICRC-2 token canister...");
      
      let createResult = await (with cycles = 1_500_000_000_000) mgmt.create_canister<system>({
        settings = null
      });
      let newCanister = createResult.canister_id;
      Debug.print("New token canister created: " # Principal.toText(newCanister));

      createdCanisters := List.push(newCanister, createdCanisters);

      switch (wasm_module) {
        case (?icrc1_wasm) {
          let metadata = createIcrc2Metadata(
            logo, 
            description, 
            website, 
            telegram, 
            twitter
          );
          
          let initArgs : InitArgs = {
            token_symbol = symbol;
            token_name = name;
            decimals = ?DEFAULT_DECIMALS;
            minting_account = { owner = caller; subaccount = null };
            transfer_fee = DEFAULT_FEE;
            metadata = metadata;
            feature_flags = ?{ icrc2 = true };
            initial_balances = [({ owner = caller; subaccount = null }, FIXED_SUPPLY * (10 ** Nat8.toNat(DEFAULT_DECIMALS)))];
            archive_options = {
              num_blocks_to_archive = Nat64.fromNat(1000);
              trigger_threshold = Nat64.fromNat(2000);
              controller_id = self;
              cycles_for_archive_creation = ?Nat64.fromNat(10_000_000_000_000);
            };
          };

          let ledgerArgs : LedgerArgs = #Init(initArgs);
          let encodedArgs = to_candid(ledgerArgs);

          Debug.print("Installing the ICRC-2 ledger code...");
          
          await mgmt.install_code<system>({
            canister_id = newCanister;
            wasm_module = icrc1_wasm;
            arg = encodedArgs;
            mode = #install;
          });

          // Store token metadata
          let tokenMeta : TokenMetadata = {
            name = name;
            symbol = symbol;
            decimals = DEFAULT_DECIMALS;
            fee = DEFAULT_FEE;
            logo = logo;
            description = description;
            website = website;
            telegram = telegram;
            twitter = twitter;
            created_at = Time.now();
            total_supply = FIXED_SUPPLY;
            minting_account = { owner = caller; subaccount = null };
          };
          
          tokenMetadata.put(newCanister, tokenMeta);
          tokens := List.push(newCanister, tokens);
          
          Debug.print("ICRC-2 token canister successfully created with fixed supply of 1B tokens.");
          #ok(newCanister)
        };
        case null {
          return #err("WASM module not available in stable memory. Please fetch or upload it first.");
        };
      }
    } catch(e) {
      let errorMessage = "Failed to create ICRC-2 token: " # Error.message(e);
      Debug.print(errorMessage);
      #err(errorMessage)
    }
  };

  // Legacy method for backward compatibility
  public shared({ caller }) func createToken(
    name : Text,
    symbol : Text,
    description : Text
  ) : async Result.Result<Principal, Text> {
    await createIcrc2Token(
      name,
      symbol,
      #ImageUrl(""), // empty logo
      description,
      null, // no website
      null, // no telegram
      null  // no twitter
    )
  };

  // Query functions
  public query func listTokens() : async [Principal] {
    List.toArray(tokens)
  };

  public query func listAllCreatedCanisters() : async [Principal] {
    List.toArray(createdCanisters)
  };

  public query func getTokenMetadata(tokenId : Principal) : async ?TokenMetadata {
    tokenMetadata.get(tokenId)
  };

  public query func getAllTokensMetadata() : async [(Principal, TokenMetadata)] {
    Iter.toArray(tokenMetadata.entries())
  };

  public query func isWasmAvailable() : async Bool {
    wasm_module != null
  };

  public query func getWasmSize() : async ?Nat {
    switch (wasm_module) {
      case (?wasm) ?wasm.size();
      case null null;
    }
  };

  public query func getFixedSupply() : async Nat {
    FIXED_SUPPLY
  };

  public query func getDefaultDecimals() : async Nat8 {
    DEFAULT_DECIMALS
  };

  public query func getDefaultFee() : async Nat {
    DEFAULT_FEE
  };

  public query func getStats() : async { 
    totalTokens: Nat; 
    totalCreatedCanisters: Nat; 
    wasmAvailable: Bool;
    wasmSize: ?Nat;
    fixedSupply: Nat;
    defaultDecimals: Nat8;
    defaultFee: Nat;
  } {
    {
      totalTokens = List.size(tokens);
      totalCreatedCanisters = List.size(createdCanisters);
      wasmAvailable = wasm_module != null;
      wasmSize = switch (wasm_module) {
        case (?wasm) ?wasm.size();
        case null null;
      };
      fixedSupply = FIXED_SUPPLY;
      defaultDecimals = DEFAULT_DECIMALS;
      defaultFee = DEFAULT_FEE;
    }
  };

  // ICRC-2 Standard compliance check
  public shared func checkIcrc2Standard(tokenId : Principal) : async Result.Result<Bool, Text> {
    try {
      let token : TokenInterface = actor(Principal.toText(tokenId));
      let standards = await token.icrc1_supported_standards();
      
      let hasIcrc1 = Array.find<{name: Text; url: Text}>(standards, func(standard) = standard.name == "ICRC-1");
      let hasIcrc2 = Array.find<{name: Text; url: Text}>(standards, func(standard) = standard.name == "ICRC-2");
      
      #ok(hasIcrc1 != null and hasIcrc2 != null)
    } catch (e) {
      #err("Failed to check standards: " # Error.message(e))
    }
  };

  // Token testing functions
  public shared func getTokenInfo(tokenId : Principal) : async Result.Result<{
    name: Text;
    symbol: Text;
    decimals: Nat8;
    fee: Nat;
    totalSupply: Nat;
    mintingAccount: ?Account;
    metadata: [(Text, Value)];
    standards: [{name: Text; url: Text}];
  }, Text> {
    try {
      let token : TokenInterface = actor(Principal.toText(tokenId));
      
      let name = await token.icrc1_name();
      let symbol = await token.icrc1_symbol();
      let decimals = await token.icrc1_decimals();
      let fee = await token.icrc1_fee();
      let totalSupply = await token.icrc1_total_supply();
      let mintingAccount = await token.icrc1_minting_account();
      let metadata = await token.icrc1_metadata();
      let standards = await token.icrc1_supported_standards();

      #ok({
        name = name;
        symbol = symbol;
        decimals = decimals;
        fee = fee;
        totalSupply = totalSupply;
        mintingAccount = mintingAccount;
        metadata = metadata;
        standards = standards;
      })
    } catch (e) {
      #err("Failed to get token info: " # Error.message(e))
    }
  };

  public shared func getTokenBalance(tokenId : Principal, account : Account) : async Result.Result<Nat, Text> {
    try {
      let token : TokenInterface = actor(Principal.toText(tokenId));
      let balance = await token.icrc1_balance_of(account);
      #ok(balance)
    } catch (e) {
      #err("Failed to get balance: " # Error.message(e))
    }
  };

  public shared func testTokenTransfer(
    tokenId : Principal,
    to : Account,
    amount : Nat,
    memo : ?Blob
  ) : async Result.Result<Nat, Text> {
    try {
      let token : TokenInterface = actor(Principal.toText(tokenId));
      let transferResult = await token.icrc1_transfer({
        from_subaccount = null;
        to = to;
        amount = amount;
        fee = null;
        memo = memo;
        created_at_time = null;
      });
      
      switch (transferResult) {
        case (#ok(blockIndex)) #ok(blockIndex);
        case (#err(error)) {
          let errorMsg = switch (error) {
            case (#BadFee({ expected_fee })) "Bad fee, expected: " # Nat.toText(expected_fee);
            case (#BadBurn({ min_burn_amount })) "Bad burn, minimum: " # Nat.toText(min_burn_amount);
            case (#InsufficientFunds({ balance })) "Insufficient funds, balance: " # Nat.toText(balance);
            case (#TooOld) "Transaction too old";
            case (#CreatedInFuture({ ledger_time })) "Created in future, ledger time: " # Nat64.toText(ledger_time);
            case (#TemporarilyUnavailable) "Temporarily unavailable";
            case (#Duplicate({ duplicate_of })) "Duplicate of block: " # Nat.toText(duplicate_of);
            case (#GenericError({ error_code; message })) "Generic error " # Nat.toText(error_code) # ": " # message;
          };
          #err(errorMsg)
        };
      }
    } catch (e) {
      #err("Failed to transfer: " # Error.message(e))
    }
  };

  public shared func testTokenApproval(
    tokenId : Principal,
    spender : Account,
    amount : Nat,
    expiresAt : ?Nat64
  ) : async Result.Result<Nat, Text> {
    try {
      let token : TokenInterface = actor(Principal.toText(tokenId));
      let approvalResult = await token.icrc2_approve({
        from_subaccount = null;
        spender = spender;
        amount = amount;
        expected_allowance = null;
        expires_at = expiresAt;
        fee = null;
        memo = null;
        created_at_time = null;
      });
      
      switch (approvalResult) {
        case (#ok(blockIndex)) #ok(blockIndex);
        case (#err(error)) {
          let errorMsg = switch (error) {
            case (#BadFee({ expected_fee })) "Bad fee, expected: " # Nat.toText(expected_fee);
            case (#InsufficientFunds({ balance })) "Insufficient funds, balance: " # Nat.toText(balance);
            case (#TooOld) "Transaction too old";
            case (#CreatedInFuture({ ledger_time })) "Created in future, ledger time: " # Nat64.toText(ledger_time);
            case (#TemporarilyUnavailable) "Temporarily unavailable";
            case (#Duplicate({ duplicate_of })) "Duplicate of block: " # Nat.toText(duplicate_of);
            case (#GenericError({ error_code; message })) "Generic error " # Nat.toText(error_code) # ": " # message;
            case (_) "Unknown error";
          };
          #err(errorMsg)
        };
      }
    } catch (e) {
      #err("Failed to approve: " # Error.message(e))
    }
  };

  public shared func getTokenAllowance(
    tokenId : Principal,
    owner : Account,
    spender : Account
  ) : async Result.Result<Allowance, Text> {
    try {
      let token : TokenInterface = actor(Principal.toText(tokenId));
      let allowance = await token.icrc2_allowance({
        account = owner;
        spender = spender;
      });
      #ok(allowance)
    } catch (e) {
      #err("Failed to get allowance: " # Error.message(e))
    }
  };

  public shared func testTransferFrom(
    tokenId : Principal,
    from : Account,
    to : Account,
    amount : Nat,
    spenderSubaccount : ?[Nat8]
  ) : async Result.Result<Nat, Text> {
    try {
      let token : TokenInterface = actor(Principal.toText(tokenId));
      let transferResult = await token.icrc2_transfer_from({
        spender_subaccount = spenderSubaccount;
        from = from;
        to = to;
        amount = amount;
        fee = null;
        memo = null;
        created_at_time = null;
      });
      
      switch (transferResult) {
        case (#ok(blockIndex)) #ok(blockIndex);
        case (#err(error)) {
          let errorMsg = switch (error) {
            case (#BadFee({ expected_fee })) "Bad fee, expected: " # Nat.toText(expected_fee);
            case (#InsufficientFunds({ balance })) "Insufficient funds, balance: " # Nat.toText(balance);
            case (#TooOld) "Transaction too old";
            case (#CreatedInFuture({ ledger_time })) "Created in future, ledger time: " # Nat64.toText(ledger_time);
            case (#TemporarilyUnavailable) "Temporarily unavailable";
            case (#Duplicate({ duplicate_of })) "Duplicate of block: " # Nat.toText(duplicate_of);
            case (#GenericError({ error_code; message })) "Generic error " # Nat.toText(error_code) # ": " # message;
            case (_) "Unknown error";
          };
          #err(errorMsg)
        };
      }
    } catch (e) {
      #err("Failed to transfer from: " # Error.message(e))
    }
  };
}