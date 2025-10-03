# TokenFactory - ICRC-2 Token Creation Platform

A comprehensive token factory for creating and managing ICRC-2 compliant tokens on the Internet Computer Protocol (ICP). This factory supports both Bitcoin-style (21M supply) and Ethereum-style (1B supply) token creation with full metadata support.

## Features

- **Dual Chain Type Support**: Create tokens with Bitcoin (21M) or Ethereum (1B) supply models
- **ICRC-2 Compliance**: Full support for ICRC-1 and ICRC-2 standards
- **Rich Metadata**: Support for logos, descriptions, social media links, and custom fields
- **Factory Management**: TokenFactory mints all initial supply and manages token distribution
- **Comprehensive Queries**: 40+ query functions for token discovery and analytics
- **Persistent Storage**: Stable storage ensures data survives canister upgrades

## Token Supply Models

| Chain Type | Total Supply | Use Case |
|------------|--------------|----------|
| Bitcoin    | 21,000,000   | Scarce, store-of-value tokens |
| Ethereum   | 1,000,000,000| High-circulation utility tokens |

## Quick Start

### 1. Deploy the TokenFactory

```bash
dfx deploy TokenFactory
```

### 2. Upload or Fetch WASM Module

The factory needs the ICRC-1 ledger WASM to create tokens:

```bash
# Option 1: Automatically fetch from DFINITY
dfx canister call TokenFactory save_wasm

# Option 2: Upload your own WASM
dfx canister call TokenFactory uploadWasm '(blob "...")'

# Option 3: Check and fetch if needed
dfx canister call TokenFactory checkAndSaveWasm
```

### 3. Create Your First Token

#### Bitcoin-Style Token (21M Supply)

```bash
dfx canister call TokenFactory createBitcoinToken '(
  "My Bitcoin Token",
  "MBT",
  variant { ImageUrl = "https://example.com/logo.png" },
  "A scarce digital asset",
  opt "https://mytoken.com",
  opt "https://t.me/mytoken",
  opt "https://twitter.com/mytoken"
)'
```

#### Ethereum-Style Token (1B Supply)

```bash
dfx canister call TokenFactory createEthereumToken '(
  "My Ethereum Token",
  "MET",
  variant { ImageUrl = "https://example.com/logo.png" },
  "A high-supply utility token",
  opt "https://mytoken.com",
  opt "https://t.me/mytoken",
  opt "https://twitter.com/mytoken"
)'
```

## Core Functions

### Token Creation

| Function | Description | Supply |
|----------|-------------|--------|
| `createBitcoinToken()` | Create Bitcoin-style token | 21M |
| `createEthereumToken()` | Create Ethereum-style token | 1B |
| `createTokenWithChain()` | Create with explicit chain type | Variable |
| `createIcrc2Token()` | Legacy method (defaults to Ethereum) | 1B |

### Token Discovery

```motoko
// List all tokens
listTokens() : async [Principal]

// Get token metadata
getTokenMetadata(tokenId : Principal) : async ?TokenMetadata

// Search by name or symbol
searchTokens(searchTerm : Text) : async [(Principal, TokenMetadata)]

// Filter by chain type
getBitcoinTokens() : async [(Principal, TokenMetadata)]
getEthereumTokens() : async [(Principal, TokenMetadata)]

// Get recent tokens
getRecentTokens(limit : Nat) : async [(Principal, TokenMetadata)]
```

### Balance Management

```motoko
// Check TokenFactory balance for a token
getFactoryTokenBalance(tokenId : Principal) : async Result.Result<Nat, Text>

// Get all factory balances
getAllFactoryBalances() : async [(Principal, Result.Result<Nat, Text>)]
```

### Analytics

```motoko
// Basic statistics
getStats() : async {
  totalTokens: Nat;
  bitcoinTokens: Nat;
  ethereumTokens: Nat;
  totalCreatedCanisters: Nat;
  wasmAvailable: Bool;
  wasmSize: ?Nat;
}

// Detailed statistics
getDetailedStats() : async {
  // Includes average supply, social media stats, and more
}

// Paginated results
getTokensPaginated(page : Nat, pageSize : Nat) : async {
  tokens: [(Principal, TokenMetadata)];
  totalPages: Nat;
  currentPage: Nat;
  totalTokens: Nat;
}
```

## Token Metadata Structure

```motoko
type TokenMetadata = {
  name : Text;
  symbol : Text;
  decimals : Nat8;           // Default: 8
  fee : Nat;                 // Default: 10,000
  logo : LogoData;
  description : Text;
  website : ?Text;
  telegram : ?Text;
  twitter : ?Text;
  created_at : Int;
  total_supply : Nat;
  chain_type : ChainType;
  minting_account : Account;
}
```

## Advanced Queries

### Filter by Supply Range

```motoko
getTokensBySupplyRange(minSupply : Nat, maxSupply : Nat)
getHighSupplyTokens()  // >= 1B tokens
getLowSupplyTokens()   // <= 21M tokens
```

### Filter by Social Media

```motoko
getTokensWithWebsite()
getTokensWithTelegram()
getTokensWithTwitter()
getTokensWithAllSocials()
```

### Time-Based Queries

```motoko
getTokensCreatedAfter(timestamp : Int)
getTokensCreatedBefore(timestamp : Int)
getRecentTokens(limit : Nat)
getOldestTokens(limit : Nat)
```

### Search and Discovery

```motoko
findTokenBySymbol(symbol : Text)
findTokenByName(name : Text)
searchTokens(searchTerm : Text)  // Search name, symbol, description
```

## Default Configuration

| Setting | Value |
|---------|-------|
| Decimals | 8 |
| Transfer Fee | 10,000 |
| Bitcoin Supply | 21,000,000 |
| Ethereum Supply | 1,000,000,000 |
| Initial Holder | TokenFactory |

## Token Distribution

All tokens are initially minted to the TokenFactory canister, which serves as the minting account. The factory owner can then distribute tokens as needed using ICRC-1/ICRC-2 transfer functions.

## ICRC Standards Support

### ICRC-1 (Base Standard)
- ✅ Token transfers
- ✅ Balance queries
- ✅ Metadata support
- ✅ Fee structure

### ICRC-2 (Approve & Transfer From)
- ✅ Allowances
- ✅ Approve mechanism
- ✅ Transfer from approved accounts

## Metadata Fields

### Standard Fields (Auto-managed)
- `icrc1:name`
- `icrc1:symbol`
- `icrc1:decimals`
- `icrc1:fee`

### Custom Fields (You provide)
- `icrc1:logo` - Image URL or Blob
- `icrc1:description` - Token description
- `icrc1:website` - Project website
- `custom:telegram` - Telegram link
- `custom:twitter` - Twitter/X link
- `custom:chain_type` - Bitcoin or Ethereum
- `custom:max_supply` - Maximum supply

## Error Handling

Common errors and solutions:

| Error | Solution |
|-------|----------|
| "WASM module not available" | Call `save_wasm()` first |
| "Token name is required" | Provide non-empty name |
| "Token symbol is required" | Provide non-empty symbol |
| "Token description is required" | Provide non-empty description |

## Storage & Persistence

- **Stable Variables**: `tokens`, `createdCanisters`, `wasm_module`, `tokenMetadataEntries`
- **Upgrade Safe**: Uses `preupgrade()` and `postupgrade()` hooks
- **HashMap**: Runtime metadata storage with stable backup

## Query Function Categories

1. **Basic Listing** (2 functions)
2. **Metadata** (2 functions)
3. **Chain Type Filtering** (3 functions)
4. **Search** (3 functions)
5. **Time-based** (4 functions)
6. **Supply-based** (3 functions)
7. **Social Media** (4 functions)
8. **Fee & Decimals** (2 functions)
9. **Logo Type** (2 functions)
10. **System State** (3 functions)
11. **Constants** (5 functions)
12. **Statistics** (4 functions)
13. **Pagination** (1 function)
14. **Utilities** (2 functions)

**Total: 40 Query Functions**

## Best Practices

1. **Always check WASM availability** before creating tokens
2. **Use descriptive names and symbols** for better discoverability
3. **Provide social media links** to build community trust
4. **Choose the right chain type** based on tokenomics
5. **Monitor factory balances** regularly
6. **Use pagination** for large token lists

## Security Considerations

- TokenFactory is the minting account for all created tokens
- Only the factory can mint additional tokens (if implemented)
- Transfer fees help prevent spam
- All token creation is logged and queryable
- Canister controllers should be carefully managed

## Integration Example

```javascript
// JavaScript/TypeScript
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "./declarations/TokenFactory";

const agent = new HttpAgent({ host: "https://ic0.app" });
const tokenFactory = Actor.createActor(idlFactory, {
  agent,
  canisterId: "your-canister-id",
});

// Create a token
const result = await tokenFactory.createBitcoinToken(
  "MyToken",
  "MTK",
  { ImageUrl: "https://example.com/logo.png" },
  "My awesome token",
  ["https://mytoken.com"],
  ["https://t.me/mytoken"],
  ["https://twitter.com/mytoken"]
);

// List all tokens
const tokens = await tokenFactory.listTokens();

// Get statistics
const stats = await tokenFactory.getStats();
```


## Support

For issues, questions, or contributions:
- Check the [ICP Developer Docs](https://internetcomputer.org/docs)
- Review [ICRC Standards](https://github.com/dfinity/ICRC-1)
- Join the ICP Developer Forum

## License

This project is provided as-is for educational and development purposes.

---

Built with ❤️ on the Internet Computer