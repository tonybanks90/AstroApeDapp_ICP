import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Blob "mo:base/Blob";
import Debug "mo:base/Debug";
import List "mo:base/List";
import Cycles "mo:base/ExperimentalCycles";
import Error "mo:base/Error";
import Nat16 "mo:base/Nat16"; // May not be needed anymore
import Nat64 "mo:base/Nat64"; // May not be needed anymore
import Candid "mo:candid/Candid";

// Actor class now takes the WASM blob as an initialization argument
actor class TokenFactory(init_wasm : Blob) { // <--- WASM provided here

  // Public type matching the ICRC-1 Ledger canister's init arguments
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

  // Stable state to persist across upgrades
  stable var tokens : List.List<Principal> = List.nil();
  // Store the provided WASM. Make it optional ('?') for upgrade safety,
  // ensuring it's always re-provided during upgrades if needed.
  stable var wasm_module : ?Blob = ?init_wasm; // <--- Initialize from argument

  // Actor interface for the IC Management Canister (still needed)
  let mgmt = actor "aaaaa-aa" : actor {
    create_canister : shared { settings : ?{ controllers : ?[Principal] } } -> async { canister_id : Principal };
    install_code : shared {
      canister_id : Principal;
      wasm_module : Blob;
      arg : Blob;
      mode : { #install; #reinstall; #upgrade };
    } -> async ();
  };

  // --- HTTP Outcall related code removed ---
  // let http = actor ... (Removed)
  // func fetch_wasm(...) (Removed)
  // func save_wasm(...) (Removed)
  // func checkAndSaveWasm(...) (Removed)
  // public shared func testGoogle(...) (Removed)


  /// Creates a new ICRC-1 token canister using the WASM provided during factory deployment.
  /// The caller triggers creation, but the Factory gets the initial supply.
  public shared ({ caller }) func createToken(
    name : Text,
    symbol : Text,
    initialSupply : Nat
  ) : async Result.Result<Principal, Text> {
    try {
        // 1. Check if the WASM module is actually set (it should be if deployed correctly)
        let current_wasm : Blob = switch wasm_module {
          case (?the_wasm) { 
            Debug.print("Using stored WASM module.");
            the_wasm;
          };
          case null {
            let errorMsg = "Factory Error: ICRC-1 WASM module has not been set during factory initialization/upgrade.";
            Debug.print(errorMsg);
            trap(errorMsg);
          };
        };

        // 2. Add cycles for canister creation (adjust as needed)
        let creation_cycles : Nat = 100_000_000_000; // Example
        Debug.print("Adding " # Nat.toText(creation_cycles) # " cycles for canister creation...");
        Cycles.add(creation_cycles);

        // 3. Create a new empty canister
        Debug.print("Creating new canister with factory as a controller...");
        let createResult = await mgmt.create_canister({
           settings = ?{ controllers = ?[ Principal.fromActor(this) ] }
        });
        let newCanisterId = createResult.canister_id;
        Debug.print("New token canister created: " # Principal.toText(newCanisterId));

        // 4. Prepare installation arguments using the stored WASM
        Debug.print("Preparing installation arguments...");
        let initArgs : InitArgs = {
          token_symbol = symbol;
          token_name = name;
          minting_account = { owner = Principal.fromActor(this) }; // Factory is minter
          transfer_fee = 10_000;
          metadata = [
            ("icrc1:name", name),
            ("icrc1:symbol", symbol),
            ("icrc1:decimals", "8") // Adjust if needed
          ];
          feature_flags = ?{ icrc2 = true };
          initial_balances = [{ owner = Principal.fromActor(this); amount = initialSupply }]; // Factory gets supply
          archive_options = {
            num_blocks_to_archive = 2000;
            trigger_threshold = 4000;
            controller_id = Principal.fromActor(this); // Factory controls archive
            cycles_for_archive_creation = ?10_000_000_000; // Example
          };
        };

        Debug.print("Encoding initialization arguments using Candid...");
        let encodedArgs : Blob = Candid.encode(initArgs);
        Debug.print("Arguments encoded (size: " # Nat.toText(Blob.size(encodedArgs)) # " bytes).");

        // 5. Install the code using the stored WASM
        Debug.print("Installing the stored ledger WASM onto the new canister...");
        await mgmt.install_code({
          canister_id = newCanisterId;
          wasm_module = current_wasm; // Use the WASM from the stable variable
          arg = encodedArgs;
          mode = #install;
        });

        Debug.print("Token canister code successfully installed.");

        // 6. Add the new canister's Principal to our stable list
        tokens := List.push(newCanisterId, tokens);
        Debug.print("New token canister principal added to the list.");

        // 7. Return the Principal of the newly created token canister
        #ok(newCanisterId)

    } catch(e) {
      let errorMessage = "Failed to create token canister: " # Error.message(e);
      Debug.print(errorMessage);
      #err(errorMessage)
    }
  };

} // end actor class TokenFactory
