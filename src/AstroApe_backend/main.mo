import Nat "mo:base/Nat";
import lib "lib.mo"; // Adjust the path according to your project structure

actor Token {
  // Token metadata
  let metadata: lib.TokenMetadata = lib.createMetadata(
    "MyToken",   // Name
    "MTK",       // Symbol
    18,          // Decimals
    ?("https://example.com/logo.png") // Logo URL (optional)
  );

  // Function to get token metadata
  public query func getMetadata(): async lib.TokenMetadata {
    return metadata;
  };

  // Example function for testing
  public query func getSupply(): async Nat {
    return 1000000000; // 1 billion tokens
  };

  // Additional token functionalities can be added here
};
