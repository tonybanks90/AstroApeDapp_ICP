import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Nat32 "mo:base/Nat32";
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
import Char "mo:base/Char";
import Int "mo:base/Int"


persistent actor TokenFactory {
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

  // Chain selector type
  public type ChainType = {
    #Bitcoin;
    #Ethereum;
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
    chain_type : ChainType;
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

  // Constants for different chain types
  private transient let BITCOIN_SUPPLY : Nat = 21_000_000; // 21 Million tokens
  private transient let ETHEREUM_SUPPLY : Nat = 1_000_000_000; // 1 Billion tokens
  private transient let DEFAULT_DECIMALS : Nat8 = 8;
  private transient let DEFAULT_FEE : Nat = 10_000;

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

  // Helper function to get total supply based on chain type
  private func getSupplyByChainType(chainType : ChainType) : Nat {
    switch (chainType) {
      case (#Bitcoin) BITCOIN_SUPPLY;
      case (#Ethereum) ETHEREUM_SUPPLY;
    }
  };

  // Helper function to convert ChainType to text for metadata
  private func chainTypeToText(chainType : ChainType) : Text {
    switch (chainType) {
      case (#Bitcoin) "Bitcoin";
      case (#Ethereum) "Ethereum";
    }
  };

  // Helper function to create ICRC-2 compliant metadata with chain type
  // Note: Standard fields like icrc1:name, icrc1:symbol, icrc1:decimals, icrc1:fee
  // are automatically handled by the ledger and should NOT be included in metadata
  func createIcrc2MetadataWithChain(
    logo : LogoData,
    description : Text,
    website : ?Text,
    telegram : ?Text,
    twitter : ?Text,
    chainType : ChainType
  ) : [(Text, MetadataValue)] {
    var metadata : [(Text, MetadataValue)] = [
      ("icrc1:description", #Text(description)),
      ("custom:chain_type", #Text(chainTypeToText(chainType))),
      ("custom:max_supply", #Nat(getSupplyByChainType(chainType))),
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
        metadata := Array.append(metadata, [("custom:telegram", #Text(tg))]);
      };
      case null {};
    };

    switch (twitter) {
      case (?tw) {
        metadata := Array.append(metadata, [("custom:twitter", #Text(tw))]);
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

  // Enhanced token creation with chain type selector
  public shared({ caller }) func createTokenWithChain(
    name : Text,
    symbol : Text,
    logo : LogoData,
    description : Text,
    website : ?Text,
    telegram : ?Text,
    twitter : ?Text,
    chainType : ChainType
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
      let factoryAccount : Account = { owner = self; subaccount = null };

      Debug.print("Creating new " # chainTypeToText(chainType) # " token canister...");
      
      let createResult = await (with cycles = 1_500_000_000_000) mgmt.create_canister<system>({
        settings = null
      });
      let newCanister = createResult.canister_id;
      Debug.print("New token canister created: " # Principal.toText(newCanister));

      createdCanisters := List.push(newCanister, createdCanisters);

      switch (wasm_module) {
        case (?icrc1_wasm) {
          let metadata = createIcrc2MetadataWithChain(
            logo, 
            description, 
            website, 
            telegram, 
            twitter,
            chainType
          );
          
          let totalSupply = getSupplyByChainType(chainType);
          let totalSupplyWithDecimals = totalSupply * (10 ** Nat8.toNat(DEFAULT_DECIMALS));
          
          let initArgs : InitArgs = {
            token_symbol = symbol;
            token_name = name;
            decimals = ?DEFAULT_DECIMALS;
            minting_account = factoryAccount; // TokenFactory as minting account
            transfer_fee = DEFAULT_FEE;
            metadata = metadata;
            feature_flags = ?{ icrc2 = true };
            initial_balances = [(factoryAccount, totalSupplyWithDecimals)]; // Mint to TokenFactory
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
            total_supply = totalSupply;
            chain_type = chainType;
            minting_account = factoryAccount;
          };
          
          tokenMetadata.put(newCanister, tokenMeta);
          tokens := List.push(newCanister, tokens);
          
          Debug.print(chainTypeToText(chainType) # " token canister successfully created with supply of " # Nat.toText(totalSupply) # " tokens minted to TokenFactory.");
          #ok(newCanister)
        };
        case null {
          return #err("WASM module not available in stable memory. Please fetch or upload it first.");
        };
      }
    } catch(e) {
      let errorMessage = "Failed to create " # chainTypeToText(chainType) # " token: " # Error.message(e);
      Debug.print(errorMessage);
      #err(errorMessage)
    }
  };

  // Convenience functions for specific chain types
  public shared({ caller }) func createBitcoinToken(
    name : Text,
    symbol : Text,
    logo : LogoData,
    description : Text,
    website : ?Text,
    telegram : ?Text,
    twitter : ?Text
  ) : async Result.Result<Principal, Text> {
    await createTokenWithChain(name, symbol, logo, description, website, telegram, twitter, #Bitcoin)
  };

  public shared({ caller }) func createEthereumToken(
    name : Text,
    symbol : Text,
    logo : LogoData,
    description : Text,
    website : ?Text,
    telegram : ?Text,
    twitter : ?Text
  ) : async Result.Result<Principal, Text> {
    await createTokenWithChain(name, symbol, logo, description, website, telegram, twitter, #Ethereum)
  };

  // Legacy method for backward compatibility (defaults to Ethereum)
  public shared({ caller }) func createIcrc2Token(
    name : Text,
    symbol : Text,
    logo : LogoData,
    description : Text,
    website : ?Text,
    telegram : ?Text,
    twitter : ?Text
  ) : async Result.Result<Principal, Text> {
    await createTokenWithChain(name, symbol, logo, description, website, telegram, twitter, #Ethereum)
  };

  // Legacy method for backward compatibility (defaults to Ethereum)
  public shared({ caller }) func createToken(
    name : Text,
    symbol : Text,
    description : Text
  ) : async Result.Result<Principal, Text> {
    await createTokenWithChain(
      name,
      symbol,
      #ImageUrl(""), // empty logo
      description,
      null, // no website
      null, // no telegram
      null, // no twitter
      #Ethereum
    )
  };

  // Check TokenFactory balance for a specific token
  public shared func getFactoryTokenBalance(tokenId : Principal) : async Result.Result<Nat, Text> {
    try {
      let token : TokenInterface = actor(Principal.toText(tokenId));
      let self = Principal.fromActor(TokenFactory);
      let factoryAccount : Account = { owner = self; subaccount = null };
      let balance = await token.icrc1_balance_of(factoryAccount);
      #ok(balance)
    } catch (e) {
      #err("Failed to get TokenFactory balance: " # Error.message(e))
    }
  };

  // Get all TokenFactory balances for tokens it created
  public shared func getAllFactoryBalances() : async [(Principal, Result.Result<Nat, Text>)] {
    let tokenList = List.toArray(tokens);
    var results : [(Principal, Result.Result<Nat, Text>)] = [];
    
    for (tokenId in tokenList.vals()) {
      let balanceResult = await getFactoryTokenBalance(tokenId);
      results := Array.append(results, [(tokenId, balanceResult)]);
    };
    
    results
  };

// ===============================================
// COMPLETE TOKENFACTORY QUERY FUNCTIONS
// ===============================================

// Basic Token Listing Queries
public query func listTokens() : async [Principal] {
  List.toArray(tokens)
};

public query func listAllCreatedCanisters() : async [Principal] {
  List.toArray(createdCanisters)
};

// Token Metadata Queries
public query func getTokenMetadata(tokenId : Principal) : async ?TokenMetadata {
  tokenMetadata.get(tokenId)
};

public query func getAllTokensMetadata() : async [(Principal, TokenMetadata)] {
  Iter.toArray(tokenMetadata.entries())
};

// Chain Type Filtering Queries
public query func getTokensByChainType(chainType : ChainType) : async [(Principal, TokenMetadata)] {
  let allTokens = Iter.toArray(tokenMetadata.entries());
  Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    switch (metadata.chain_type, chainType) {
      case (#Bitcoin, #Bitcoin) true;
      case (#Ethereum, #Ethereum) true;
      case (_, _) false;
    }
  })
};

public query func getBitcoinTokens() : async [(Principal, TokenMetadata)] {
  let allTokens = Iter.toArray(tokenMetadata.entries());
  Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    switch (metadata.chain_type) {
      case (#Bitcoin) true;
      case (_) false;
    }
  })
};

public query func getEthereumTokens() : async [(Principal, TokenMetadata)] {
  let allTokens = Iter.toArray(tokenMetadata.entries());
  Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    switch (metadata.chain_type) {
      case (#Ethereum) true;
      case (_) false;
    }
  })
};

// Token Search Queries
public query func findTokenBySymbol(symbol : Text) : async ?[(Principal, TokenMetadata)] {
  let allTokens = Iter.toArray(tokenMetadata.entries());
  let matchingTokens = Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    Text.equal(metadata.symbol, symbol)
  });
  if (matchingTokens.size() > 0) {
    ?matchingTokens
  } else {
    null
  }
};

public query func findTokenByName(name : Text) : async ?[(Principal, TokenMetadata)] {
  let allTokens = Iter.toArray(tokenMetadata.entries());
  let matchingTokens = Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    Text.contains(metadata.name, #text name)
  });
  if (matchingTokens.size() > 0) {
    ?matchingTokens
  } else {
    null
  }
};

public query func searchTokens(searchTerm : Text) : async [(Principal, TokenMetadata)] {
  let allTokens = Iter.toArray(tokenMetadata.entries());
  let lowerSearchTerm = Text.map(searchTerm, func(c : Char) : Char { 
    if (c >= 'A' and c <= 'Z') {
      Char.fromNat32(Char.toNat32(c) + 32)
    } else {
      c
    }
  });
  
  Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    let lowerName = Text.map(metadata.name, func(c : Char) : Char { 
      if (c >= 'A' and c <= 'Z') {
        Char.fromNat32(Char.toNat32(c) + 32)
      } else {
        c
      }
    });
    let lowerSymbol = Text.map(metadata.symbol, func(c : Char) : Char { 
      if (c >= 'A' and c <= 'Z') {
        Char.fromNat32(Char.toNat32(c) + 32)
      } else {
        c
      }
    });
    let lowerDescription = Text.map(metadata.description, func(c : Char) : Char { 
      if (c >= 'A' and c <= 'Z') {
        Char.fromNat32(Char.toNat32(c) + 32)
      } else {
        c
      }
    });
    
    Text.contains(lowerName, #text lowerSearchTerm) or
    Text.contains(lowerSymbol, #text lowerSearchTerm) or
    Text.contains(lowerDescription, #text lowerSearchTerm)
  })
};

// Time-based Queries
public query func getTokensCreatedAfter(timestamp : Int) : async [(Principal, TokenMetadata)] {
  let allTokens = Iter.toArray(tokenMetadata.entries());
  Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    metadata.created_at > timestamp
  })
};

public query func getTokensCreatedBefore(timestamp : Int) : async [(Principal, TokenMetadata)] {
  let allTokens = Iter.toArray(tokenMetadata.entries());
  Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    metadata.created_at < timestamp
  })
};

public query func getRecentTokens(limit : Nat) : async [(Principal, TokenMetadata)] {
  let allTokens = Iter.toArray(tokenMetadata.entries());
  let sortedTokens = Array.sort<(Principal, TokenMetadata)>(allTokens, func(a, b) {
    Int.compare(b.1.created_at, a.1.created_at) // Sort by creation time, newest first
  });
  
  if (sortedTokens.size() <= limit) {
    sortedTokens
  } else {
    Array.tabulate<(Principal, TokenMetadata)>(limit, func(i) = sortedTokens[i])
  }
};

public query func getOldestTokens(limit : Nat) : async [(Principal, TokenMetadata)] {
  let allTokens = Iter.toArray(tokenMetadata.entries());
  let sortedTokens = Array.sort<(Principal, TokenMetadata)>(allTokens, func(a, b) {
    Int.compare(a.1.created_at, b.1.created_at) // Sort by creation time, oldest first
  });
  
  if (sortedTokens.size() <= limit) {
    sortedTokens
  } else {
    Array.tabulate<(Principal, TokenMetadata)>(limit, func(i) = sortedTokens[i])
  }
};

// Supply-based Queries
public query func getTokensBySupplyRange(minSupply : Nat, maxSupply : Nat) : async [(Principal, TokenMetadata)] {
  let allTokens = Iter.toArray(tokenMetadata.entries());
  Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    metadata.total_supply >= minSupply and metadata.total_supply <= maxSupply
  })
};

public query func getHighSupplyTokens() : async [(Principal, TokenMetadata)] {
  let allTokens = Iter.toArray(tokenMetadata.entries());
  Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    metadata.total_supply >= ETHEREUM_SUPPLY // 1B or more
  })
};

public query func getLowSupplyTokens() : async [(Principal, TokenMetadata)] {
  let allTokens = Iter.toArray(tokenMetadata.entries());
  Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    metadata.total_supply <= BITCOIN_SUPPLY // 21M or less
  })
};

// Social Media Queries
public query func getTokensWithWebsite() : async [(Principal, TokenMetadata)] {
  let allTokens = Iter.toArray(tokenMetadata.entries());
  Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    metadata.website != null
  })
};

public query func getTokensWithTelegram() : async [(Principal, TokenMetadata)] {
  let allTokens = Iter.toArray(tokenMetadata.entries());
  Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    metadata.telegram != null
  })
};

public query func getTokensWithTwitter() : async [(Principal, TokenMetadata)] {
  let allTokens = Iter.toArray(tokenMetadata.entries());
  Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    metadata.twitter != null
  })
};

public query func getTokensWithAllSocials() : async [(Principal, TokenMetadata)] {
  let allTokens = Iter.toArray(tokenMetadata.entries());
  Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    metadata.website != null and metadata.telegram != null and metadata.twitter != null
  })
};

// Fee and Decimals Queries
public query func getTokensByFeeRange(minFee : Nat, maxFee : Nat) : async [(Principal, TokenMetadata)] {
  let allTokens = Iter.toArray(tokenMetadata.entries());
  Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    metadata.fee >= minFee and metadata.fee <= maxFee
  })
};

public query func getTokensByDecimals(decimals : Nat8) : async [(Principal, TokenMetadata)] {
  let allTokens = Iter.toArray(tokenMetadata.entries());
  Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    metadata.decimals == decimals
  })
};

// Logo Type Queries
public query func getTokensWithImageUrl() : async [(Principal, TokenMetadata)] {
  let allTokens = Iter.toArray(tokenMetadata.entries());
  Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    switch (metadata.logo) {
      case (#ImageUrl(_)) true;
      case (_) false;
    }
  })
};

public query func getTokensWithImageBlob() : async [(Principal, TokenMetadata)] {
  let allTokens = Iter.toArray(tokenMetadata.entries());
  Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    switch (metadata.logo) {
      case (#ImageBlob(_)) true;
      case (_) false;
    }
  })
};

// System State Queries
public query func isWasmAvailable() : async Bool {
  wasm_module != null
};

public query func getWasmSize() : async ?Nat {
  switch (wasm_module) {
    case (?wasm) ?wasm.size();
    case null null;
  }
};

// Constants Queries
public query func getBitcoinSupply() : async Nat {
  BITCOIN_SUPPLY
};

public query func getEthereumSupply() : async Nat {
  ETHEREUM_SUPPLY
};

public query func getDefaultDecimals() : async Nat8 {
  DEFAULT_DECIMALS
};

public query func getDefaultFee() : async Nat {
  DEFAULT_FEE
};

public query func getChainTypeSupply(chainType : ChainType) : async Nat {
  getSupplyByChainType(chainType)
};

// Comprehensive Statistics Query
public query func getStats() : async { 
  totalTokens: Nat; 
  bitcoinTokens: Nat;
  ethereumTokens: Nat;
  totalCreatedCanisters: Nat; 
  wasmAvailable: Bool;
  wasmSize: ?Nat;
  bitcoinSupply: Nat;
  ethereumSupply: Nat;
  defaultDecimals: Nat8;
  defaultFee: Nat;
} {
  let allTokens = Iter.toArray(tokenMetadata.entries());
  let bitcoinCount = Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    switch (metadata.chain_type) {
      case (#Bitcoin) true;
      case (_) false;
    }
  }).size();
  let ethereumCount = Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    switch (metadata.chain_type) {
      case (#Ethereum) true;
      case (_) false;
    }
  }).size();

  {
    totalTokens = List.size(tokens);
    bitcoinTokens = bitcoinCount;
    ethereumTokens = ethereumCount;
    totalCreatedCanisters = List.size(createdCanisters);
    wasmAvailable = wasm_module != null;
    wasmSize = switch (wasm_module) {
      case (?wasm) ?wasm.size();
      case null null;
    };
    bitcoinSupply = BITCOIN_SUPPLY;
    ethereumSupply = ETHEREUM_SUPPLY;
    defaultDecimals = DEFAULT_DECIMALS;
    defaultFee = DEFAULT_FEE;
  }
};

// Detailed Statistics Query
public query func getDetailedStats() : async {
  totalTokens: Nat;
  bitcoinTokens: Nat;
  ethereumTokens: Nat;
  totalCreatedCanisters: Nat;
  wasmAvailable: Bool;
  wasmSize: ?Nat;
  tokensWithWebsite: Nat;
  tokensWithTelegram: Nat;
  tokensWithTwitter: Nat;
  tokensWithAllSocials: Nat;
  averageSupply: ?Nat;
  totalSupplyAllTokens: Nat;
  uniqueDecimals: [Nat8];
  uniqueFees: [Nat];
  oldestToken: ?(Principal, Int);
  newestToken: ?(Principal, Int);
} {
  let allTokens = Iter.toArray(tokenMetadata.entries());
  
  let bitcoinCount = Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    switch (metadata.chain_type) {
      case (#Bitcoin) true;
      case (_) false;
    }
  }).size();
  
  let ethereumCount = Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    switch (metadata.chain_type) {
      case (#Ethereum) true;
      case (_) false;
    }
  }).size();
  
  let websiteCount = Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    metadata.website != null
  }).size();
  
  let telegramCount = Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    metadata.telegram != null
  }).size();
  
  let twitterCount = Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    metadata.twitter != null
  }).size();
  
  let allSocialsCount = Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    metadata.website != null and metadata.telegram != null and metadata.twitter != null
  }).size();
  
  let totalSupply = Array.foldLeft<(Principal, TokenMetadata), Nat>(allTokens, 0, func(acc, (_, metadata)) {
    acc + metadata.total_supply
  });
  
  let averageSupply = if (allTokens.size() > 0) {
    ?(totalSupply / allTokens.size())
  } else {
    null
  };
  
  let decimalsArray = Array.map<(Principal, TokenMetadata), Nat8>(allTokens, func((_, metadata)) = metadata.decimals);
  let uniqueDecimalsSet = HashMap.HashMap<Nat8, Bool>(0, Nat8.equal, func(x) = Nat32.fromNat(Nat8.toNat(x)));
  for (decimal in decimalsArray.vals()) {
    uniqueDecimalsSet.put(decimal, true);
  };
  let uniqueDecimals = Iter.toArray(uniqueDecimalsSet.keys());
  
  let feesArray = Array.map<(Principal, TokenMetadata), Nat>(allTokens, func((_, metadata)) = metadata.fee);
  let uniqueFeesSet = HashMap.HashMap<Nat, Bool>(0, Nat.equal, func(x) = Nat32.fromNat(x));
  for (fee in feesArray.vals()) {
    uniqueFeesSet.put(fee, true);
  };
  let uniqueFees = Iter.toArray(uniqueFeesSet.keys());
  
  let sortedByTime = Array.sort<(Principal, TokenMetadata)>(allTokens, func(a, b) {
    Int.compare(a.1.created_at, b.1.created_at)
  });
  
  let oldestToken = if (sortedByTime.size() > 0) {
    ?(sortedByTime[0].0, sortedByTime[0].1.created_at)
  } else {
    null
  };
  
  let newestToken = if (sortedByTime.size() > 0) {
    let last = sortedByTime[sortedByTime.size() - 1];
    ?(last.0, last.1.created_at)
  } else {
    null
  };
  
  {
    totalTokens = List.size(tokens);
    bitcoinTokens = bitcoinCount;
    ethereumTokens = ethereumCount;
    totalCreatedCanisters = List.size(createdCanisters);
    wasmAvailable = wasm_module != null;
    wasmSize = switch (wasm_module) {
      case (?wasm) ?wasm.size();
      case null null;
    };
    tokensWithWebsite = websiteCount;
    tokensWithTelegram = telegramCount;
    tokensWithTwitter = twitterCount;
    tokensWithAllSocials = allSocialsCount;
    averageSupply = averageSupply;
    totalSupplyAllTokens = totalSupply;
    uniqueDecimals = uniqueDecimals;
    uniqueFees = uniqueFees;
    oldestToken = oldestToken;
    newestToken = newestToken;
  }
};

// Pagination Query with safe division
public query func getTokensPaginated(page : Nat, pageSize : Nat) : async {
  tokens: [(Principal, TokenMetadata)];
  totalPages: Nat;
  currentPage: Nat;
  totalTokens: Nat;
} {
  let allTokens = Iter.toArray(tokenMetadata.entries());
  let totalTokens = allTokens.size();
  let totalPages = if (totalTokens == 0 or pageSize == 0) {
    0
  } else {
    (totalTokens + pageSize - 1) / pageSize  // Safe division with ceiling
  };
  
  let startIndex = page * pageSize;
  let endIndex = if (startIndex + pageSize > totalTokens) {
    totalTokens
  } else {
    startIndex + pageSize
  };
  
  let pageTokens = if (startIndex < totalTokens and startIndex < endIndex) {
    Array.tabulate<(Principal, TokenMetadata)>(
      endIndex - startIndex,
      func(i) = allTokens[startIndex + i]
    )
  } else {
    []
  };
  
  {
    tokens = pageTokens;
    totalPages = totalPages;
    currentPage = page;
    totalTokens = totalTokens;
  }
};

// Token Existence Check
public query func tokenExists(tokenId : Principal) : async Bool {
  switch (tokenMetadata.get(tokenId)) {
    case (?_) true;
    case null false;
  }
};

// Get Token Count by Chain Type
public query func getTokenCountByChainType() : async {
  bitcoin: Nat;
  ethereum: Nat;
} {
  let allTokens = Iter.toArray(tokenMetadata.entries());
  let bitcoinCount = Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    switch (metadata.chain_type) {
      case (#Bitcoin) true;
      case (_) false;
    }
  }).size();
  let ethereumCount = Array.filter<(Principal, TokenMetadata)>(allTokens, func((_, metadata)) {
    switch (metadata.chain_type) {
      case (#Ethereum) true;
      case (_) false;
    }
  }).size();
  
  {
    bitcoin = bitcoinCount;
    ethereum = ethereumCount;
  }
};
}