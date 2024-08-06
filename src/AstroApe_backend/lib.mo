// lib.mo
module lib {
  public type TokenMetadata = {
    name: Text;
    symbol: Text;
    decimals: Nat8;
    logo: ?Text; // Optional logo URL
  };

  // Example utility function (can be extended)
  public func createMetadata(name: Text, symbol: Text, decimals: Nat8, logo: ?Text) : TokenMetadata {
    return {
      name = name;
      symbol = symbol;
      decimals = decimals;
      logo = logo;
    };
  };
};
