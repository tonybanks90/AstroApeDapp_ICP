import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Blob "mo:base/Blob";
import Debug "mo:base/Debug";
import List "mo:base/List";
import Cycles "mo:base/ExperimentalCycles";
import Error "mo:base/Error";
import Nat16 "mo:base/Nat16";

actor class TokenFactory() {
  public type InitArgs = {
    token_symbol : Text;
    token_name : Text;
    minting_account : { owner : Principal };
    transfer_fee : Nat;
    metadata : [(Text, Text)];
    feature_flags : ?{ icrc2 : Bool };
    initial_balances : [{ owner : Principal; amount : Nat }];
    archive_options : {
      num_blocks_to_archive : Nat;
      trigger_threshold : Nat;
      controller_id : Principal;
      cycles_for_archive_creation : ?Nat;
    };
  };

  stable var tokens : List.List<Principal> = List.nil();
  stable var wasm_module : ?Blob = null; // Store the WASM module here

  let mgmt = actor "aaaaa-aa" : actor {
    create_canister : shared { settings : ?{ controllers : [Principal] } } -> async { canister_id : Principal };
    install_code : shared {
      canister_id : Principal;
      wasm_module : Blob;
      arg : Blob;
      mode : { #install; #reinstall; #upgrade };
    } -> async ();
  };

  let http = actor "aaaaa-aa" : actor {
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

  let icrc1_wasm_url = "https://download.dfinity.systems/ic/4833f30d3b5afd84a385dfb146581580285d8a7e/canisters/ic-icrc1-ledger.wasm.gz";

  /// Fetches the WASM module from the given URL.
  func fetch_wasm(url : Text) : async Result.Result<Blob, Text> {
    try {
      Debug.print("Fetching WASM from " # url);
      Cycles.add<system>(2_000_000_000);
      let response = await http.http_request({
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

  public shared func testGoogle() : async Result.Result<Text, Text> {
    try {
      Debug.print("Testing Google...");
      Cycles.add<system>(2_000_000_000);
      let response = await http.http_request({
        url = "https://www.google.com";
        max_response_bytes = null;
        headers = [];
        body = null;
        method = #get;
        transform = null;
      });
      if (response.status_code == 200) {
        Debug.print("Google test successful");
        #ok("Google test successful")
      } else {
        Debug.print("Google test failed with status: " # Nat16.toText(response.status_code));
        #err("Google test failed with status: " # Nat16.toText(response.status_code))
      }
    } catch (e) {
      let errMsg = "Google test failed: " # Error.message(e);
      Debug.print(errMsg);
      #err(errMsg)
    }
  };

  /// Stores the fetched WASM in stable memory.
  public shared func save_wasm() : async Result.Result<Text, Text> {
    if (wasm_module != null) {
      return #ok("WASM already fetched and saved.");
    };
    Debug.print("Fetching ICRC-1 Ledger WASM...");
    let icrc1_wasm_result = await fetch_wasm(icrc1_wasm_url);
    switch (icrc1_wasm_result) {
      case (#err(errMsg)) return #err(errMsg);
      case (#ok(icrc1_wasm)) {
        wasm_module := ?icrc1_wasm;
        Debug.print("WASM fetched and saved successfully.");
        return #ok("WASM fetched and saved successfully.");
      }
    }
  };

  /// Checks if the WASM is already saved. If not, it fetches and saves it.
  public shared func checkAndSaveWasm() : async Result.Result<Text, Text> {
    if (wasm_module != null) {
      return #ok("WASM is already saved.");
    } else {
      return await save_wasm();
    }
  };

  /// Creates a new token canister
  public shared ({ caller }) func createToken(
    name : Text,
    symbol : Text,
    initialSupply : Nat
  ) : async Result.Result<Principal, Text> {
    try {
      Debug.print("Adding cycles for canister creation");
      Cycles.add<system>(40_000_000_000);
      Debug.print("Creating new canister...");
      let createResult = await mgmt.create_canister<system>({
        settings = ?{ controllers = [caller] }
      });
      let newCanister = createResult.canister_id;
      Debug.print("New token canister created: " # Principal.toText(newCanister));

      let save_wasm_result = await checkAndSaveWasm();
      switch(save_wasm_result){
        case(#err(msg)) return #err(msg);
        case(#ok(_)) Debug.print("WASM checked and saved if needed.");
      };

      switch (wasm_module) {
        case (?icrc1_wasm) {
          Debug.print("WASM fetched successfully, preparing to install...");
          Debug.print("Preparing initialization arguments...");
          let initArgs : InitArgs = {
            token_symbol = symbol;
            token_name = name;
            minting_account = { owner = caller };
            transfer_fee = 10_000;
            metadata = [("icrc1:name", name), ("icrc1:symbol", symbol)];
            feature_flags = ?{ icrc2 = true };
            initial_balances = [{ owner = caller; amount = initialSupply }];
            archive_options = {
              num_blocks_to_archive = 1000;
              trigger_threshold = 2000;
              controller_id = caller;
              cycles_for_archive_creation = ?5_000_000_000_000;
            };
          };
          Debug.print("Encoding arguments using Candid...");
          let encodedArgs = to_candid(initArgs);
          Debug.print("Installing the ledger code...");
          await mgmt.install_code({
            canister_id = newCanister;
            wasm_module = icrc1_wasm;
            arg = encodedArgs;
            mode = #install;
          });
          Debug.print("Token canister successfully installed.");
          tokens := List.push(newCanister, tokens);
          #ok(newCanister)
        };
        case null {
          return #err("Failed to fetch and save WASM");
        };
      }
    } catch(e) {
      let errorMessage = "Failed to create token: " # Error.message(e);
      Debug.print(errorMessage);
      #err(errorMessage)
    }
  };

  /// Returns the list of deployed token canisters
  public query func listTokens() : async [Principal] {
    List.toArray(tokens)
  };
}