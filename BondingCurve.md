# ICP Bonding Curve Token Launch Platform

A complete token launch platform on the Internet Computer that uses automated bonding curves for price discovery, supporting both ckBTC and ckETH as base trading pairs.

## Overview

This system enables fair token launches through mathematical bonding curves that automatically determine price based on supply. Users can buy and sell tokens directly through the curve until graduation, at which point liquidity migrates to a DEX.

### Key Features

- **Dual Base Pair Support**: Launch tokens paired with ckBTC (21M supply) or ckETH (1B supply)
- **Automated Price Discovery**: LMSR-based bonding curves eliminate manual market making
- **Secure Vault System**: Isolated subaccounts per bonding curve with ICRC-2 integration
- **Multiple Curve Types**: Linear, quadratic, exponential, and logarithmic pricing
- **Graduation Mechanism**: Automatic transition to DEX at 80% of max supply
- **TokenFactory Integration**: One-click deployment of tokens with bonding curves

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    TokenFactory                           │
│  • Creates ICRC-2 token ledgers                   │
│  • Deploys bonding curve canisters                       │
│  • Sets bonding curve as token minter                    │
│  • Manages metadata and configuration                    │
└────────────────┬─────────────────────────────────────────┘
                 │
                 │ Deploys & Configures
                 ▼
┌──────────────────────────────────────────────────────────┐
│              BondingCurve Canister                        │                      │
│  • Handles buy/sell operations                           │
│  • Mints/burns tokens as needed                          │
│  • Tracks trade history and stats                        │
└────────┬──────────────────────┬──────────────────────────┘
         │                      │
         │ Mints/Burns          │ Pull/Pay Funds
         ▼                      ▼
┌─────────────────┐    ┌─────────────────────────────────┐
│  Token Ledger   │    │   BondingCurveVault             │
│  (ICRC-2)     │    │  • One subaccount per curve     │
│                 │    │  • Holds ckBTC or ckETH         │
│  • User balances│    │  • ICRC-2 transfer_from         │
│  • Transfers    │    │  • Balance tracking             │
└─────────────────┘    └─────────────────────────────────┘
```

## Core Components

### 1. TokenFactory (Enhanced)

Creates tokens with integrated bonding curves:

```motoko
// Bitcoin-based token (21M supply, 8 decimals)
createBitcoinToken(
  name, symbol, logo, description,
  website, telegram, twitter,
  bondingCurveArgs
)

// Ethereum-based token (1B supply, 18 decimals)
createEthereumToken(
  name, symbol, logo, description,
  website, telegram, twitter,
  bondingCurveArgs
)
```

### 2. BondingCurve Canister

Manages token pricing and trading:

- **Buy tokens**: `buy(base_amount)` - Purchase tokens with ckBTC/ckETH
- **Sell tokens**: `sell(token_amount)` - Sell tokens back for ckBTC/ckETH
- **Get quotes**: `get_buy_quote()`, `get_sell_quote()`
- **Check price**: `get_current_price()`
- **View stats**: `get_curve_stats()`

### 3. BondingCurveVault

Securely manages base currency reserves:

- **Isolated subaccounts**: One 32-byte subaccount per bonding curve
- **ICRC-2 integration**: Uses allowance-based transfers
- **Balance tracking**: Monitors deposits, withdrawals, and statistics
- **Multi-curve support**: Handles unlimited bonding curves

## Base Pair Specifications

### ckBTC Pairs
- **Supply**: 21,000,000 tokens
- **Decimals**: 8 (satoshis)
- **Ledger**: `mxzaz-hqaaa-aaaar-qaada-cai`
- **Smallest unit**: 1 satoshi = 0.00000001 ckBTC
- **Example initial price**: 1,000 sats (0.00001 ckBTC)

### ckETH Pairs
- **Supply**: 1,000,000,000 tokens
- **Decimals**: 18 (wei)
- **Ledger**: `ss2fx-dyaaa-aaaar-qacoq-cai`
- **Smallest unit**: 1 wei = 0.000000000000000001 ckETH
- **Example initial price**: 1,000,000,000,000 wei (0.000001 ckETH)

## Quick Start

### Prerequisites

```bash
# Install dfx
sh -ci "$(curl -fsSL https://sdk.dfinity.org/install.sh)"

# Verify installation
dfx --version
```

### 1. Deploy Vault

```bash
dfx deploy BondingCurveVault
VAULT_ID=$(dfx canister id BondingCurveVault)

# Initialize (do this after deploying TokenFactory)
dfx canister call BondingCurveVault initialize "(principal \"YOUR_TOKEN_FACTORY_ID\")"
```

### 2. Deploy TokenFactory

```bash
dfx deploy EnhancedTokenFactory

# Set vault
dfx canister call EnhancedTokenFactory setVaultCanister "(principal \"$VAULT_ID\")"

# Upload ICRC-1 ledger WASM
dfx canister call EnhancedTokenFactory uploadTokenWasm "(blob \"$(cat ic-icrc1-ledger.wasm)\")"

# Upload bonding curve WASM
dfx canister call EnhancedTokenFactory uploadBondingCurveWasm "(blob \"$(cat bonding-curve.wasm)\")"
```

### 3. Create a Token with Bonding Curve

```bash
dfx canister call TokenFactory createBitcoinToken '(
  record {
    name = "PumpToken";
    symbol = "PUMP";
    logo = variant { ImageUrl = "https://example.com/logo.png" };
    description = "Fair launch token on ICP";
    website = opt "https://pumptoken.example";
    telegram = opt "https://t.me/pumptoken";
    twitter = opt "https://x.com/pumptoken";
    bondingCurveArgs = record {
      curve_type = variant { quadratic };
      initial_price = 1000;  # 0.00001 BTC
      price_at_80_percent = 1000000;  # 0.01 BTC
      fee_percent = 100;  # 1%
      min_trade_amount = 10000;  # 0.0001 BTC minimum
    };
  }
)'
```

Returns:
```
record {
  tokenCanister = principal "xxxxx-xxxxx-xxxxx";
  bondingCurveCanister = principal "yyyyy-yyyyy-yyyyy";
  curveId = 1;
}
```

### 4. Register with Vault

```bash
dfx canister call <bonding-curve-id> registerWithVault
```

## Usage Examples

### Buy Tokens

```bash
# 1. Approve ckBTC spending
dfx canister call mxzaz-hqaaa-aaaar-qaada-cai icrc2_approve '(
  record {
    spender = record {
      owner = principal "VAULT_ID";
      subaccount = null;
    };
    amount = 100000000;  # 1 ckBTC
    fee = null;
    memo = null;
    from_subaccount = null;
    created_at_time = null;
    expected_allowance = null;
    expires_at = null;
  }
)'

# 2. Buy tokens
dfx canister call <bonding-curve-id> buy '(50000000)'  # 0.5 ckBTC
```

### Sell Tokens

```bash
dfx canister call <bonding-curve-id> sell '(1000000000)'  # 10 tokens
```

### Query Information

```bash
# Current price
dfx canister call <bonding-curve-id> get_current_price

# Buy quote
dfx canister call <bonding-curve-id> get_buy_quote '(10000000)'

# Sell quote
dfx canister call <bonding-curve-id> get_sell_quote '(1000000000)'

# Curve statistics
dfx canister call <bonding-curve-id> get_curve_stats

# Vault balance
dfx canister call $VAULT_ID getBalance '(1)'  # curveId
```

## Bonding Curve Math




### Curve Types

**Linear**: `f(t) = t`
- Constant price increase
- Predictable, straightforward

**Quadratic**: `f(t) = t²`
- Exponential acceleration
- Rewards early buyers significantly

**Exponential**: `f(t) = (e^(2t) - 1) / (e² - 1)`
- Very steep price increase
- Extreme early bird advantage

**Logarithmic**: `f(t) = log(1 + t) / log(2)`
- Slower price increase
- More gradual, fairer distribution

## Security Features

### Vault Security

- **Subaccount Isolation**: Each bonding curve has a unique 32-byte subaccount
- **No Direct Access**: Only bonding curve canister can request fund movements
- **ICRC-2 Allowances**: Users must explicitly approve spending
- **Balance Verification**: Checks before every payout
- **Transaction Logging**: Complete audit trail

### Bonding Curve Security

- **Atomic Operations**: Buy/sell with automatic rollback on failure
- **Balance Tracking**: Internal accounting plus on-chain verification
- **Slippage Protection**: Price impact calculations in quotes
- **Minimum Trade Amounts**: Prevents dust attacks
- **Fee Extraction**: Protocol fees separated and withdrawable

### Best Practices

1. **Always verify vault registration** before first trade
2. **Set appropriate slippage limits** in frontend
3. **Monitor graduation progress** to plan DEX migration
4. **Audit allowances regularly** for security
5. **Keep canisters funded** with cycles
6. **Test on testnet first** before mainnet

## Configuration Guide

### Bonding Curve Parameters

```motoko
record {
  curve_type: variant { quadratic };
  initial_price: 1000;           // Starting price (sats or wei)
  price_at_80_percent: 1000000;  // Target price at graduation
  fee_percent: 100;              // 1% = 100 basis points
  min_trade_amount: 10000;       // Minimum trade size
}
```

### Recommended Settings

**Conservative Launch (ckBTC)**:
```
initial_price: 1000 sats
price_at_80_percent: 500000 sats
curve_type: linear
fee_percent: 50  # 0.5%
```

**Aggressive Launch (ckBTC)**:
```
initial_price: 100 sats
price_at_80_percent: 10000000 sats
curve_type: exponential
fee_percent: 300  # 3%
```

**Fair Launch (ckETH)**:
```
initial_price: 1000000000000 wei
price_at_80_percent: 10000000000000000 wei
curve_type: quadratic
fee_percent: 100  # 1%
```

## API Reference

### TokenFactory

```motoko
// Create token with bonding curve
createBitcoinToken(name, symbol, logo, description, socials, bcArgs)
createEthereumToken(name, symbol, logo, description, socials, bcArgs)

// Query tokens
listTokens() : [Principal]
getTokenMetadata(tokenId) : ?TokenMetadata
getTokensByBasePair(basePair) : [(Principal, TokenMetadata)]
searchTokens(term) : [(Principal, TokenMetadata)]
getStats() : Stats
```

### BondingCurve

```motoko
// Trading
buy(base_amount) : Result<Nat, Text>
sell(token_amount) : Result<Nat, Text>

// Queries
get_current_price() : Float
get_buy_quote(amount) : Result<Quote, Text>
get_sell_quote(amount) : Result<Quote, Text>
get_curve_stats() : CurveStats
get_user_balance(user) : Nat
get_recent_trades() : [TradeInfo]

// Admin
registerWithVault() : Result<Text, Text>
withdraw_fees() : Result<Nat, Text>
```

### Vault

```motoko
// Setup
initialize(bondingCurve) : Result<(), Text>
registerCurve(curveId, basePair) : Result<[Nat8], Text>

// Operations
pullFunds(curveId, user, amount) : Result<Nat, Text>
payFunds(curveId, user, amount) : Result<Nat, Text>

// Queries
getBalance(curveId) : Result<Nat, Text>
getVaultStats(curveId) : Result<VaultStats, Text>
getSystemStats() : SystemStats
```

## Testing

```bash
# Deploy to local network
dfx start --clean --background
dfx deploy

# Create test token
./scripts/create_test_token.sh

# Test buy flow
./scripts/test_buy.sh <bonding-curve-id> 10000000

# Test sell flow  
./scripts/test_sell.sh <bonding-curve-id> 1000000000
```

## Troubleshooting

### "Insufficient allowance"
User needs to approve ckBTC/ckETH spending to vault canister

### "Vault not registered"
Call `registerWithVault()` on the bonding curve canister

### "Insufficient vault balance"
Vault may have insufficient liquidity for large sells - check with `getBalance()`

### "Token has graduated"
Bonding curve trading has stopped at 80% supply - token should migrate to DEX

### "Amount below minimum trade size"
Increase trade amount above `min_trade_amount` parameter

## Upgrade Strategy

All canisters use stable variables for state preservation:
- State persists across upgrades
- Use `preupgrade` and `postupgrade` hooks
- Test on testnet before mainnet upgrades
- Back up state before major changes

## Roadmap

- [ ] Add slippage protection parameters
- [ ] Implement graduation → DEX migration
- [ ] Create TWAP price oracle
- [ ] Build frontend with real-time charts
- [ ] Add liquidity mining rewards
- [ ] Multi-signature admin controls
- [ ] Emergency pause mechanism

## License

MIT License - see LICENSE file for details

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## Support

For issues or questions:
- Open a GitHub issue
- Join our Discord community
- Check documentation at docs.example.com