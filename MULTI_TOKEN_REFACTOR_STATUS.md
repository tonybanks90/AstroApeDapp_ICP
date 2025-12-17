# Multi-Token Refactor & Deployment Status

## Overview
We have refactored the `BondingCurve` backend from a singleton Actor Class (simulating one token per deploy) to a **Persistent Actor** managing multiple curves via a `HashMap`. This allows the same canister to handle trading for multiple tokens simultaneously, fixing the "same data for all tokens" bug.

## Current Status

### Backend (`BondingCurve.mo`)
- **Type**: `actor` (transient state)
- **State**: Transformed to `transient` HashMap (resets on upgrade, fine for local simulation).
- **API**:
  - `add_curve(InitParams)`: Logic added to support dynamic curve creation.
  - `buy(tokenId, amount)`: Updated signature.
  - `sell(tokenId, amount)`: Updated signature.
  - `get_curve_stats(tokenId)`: Updated signature.
  - `get_recent_trades(tokenId)`: Updated signature.
  - `get_holders(tokenId)`: Updated signature.
- **Removed**: `get_user_balance` (using `get_holders` instead for simplicity).

### Frontend
- **Declarations**: Regenerated via `dfx generate BondingCurve`.
- **Components Updated**:
  - `SwapAndDistribution.jsx`: Now passes `principalId` to `get_curve_stats` etc. Handles `Result` return types.
  - `SwapComponent.jsx`: Now converts `tokenId` (string) to `Principal` and passes it to `buy/sell`.

### Simulation Script (`simulate_transactions.sh`)
- **Updates**:
  - Calls `add_curve` for each token.
  - Uses `curve_id` and registers with Vault.
- **Current Issue**: The script exits with error code 1 during the BUY phase.
  - **Reason**: The script uses `set -e` (e.g., implicit or explicit), causing it to crash when `grep` fails to find a user balance (returns exit code 1).
  - **Fix Required**: Append `|| true` to the `USER_BALANCE` grep chain to prevent script exit on empty balance.

## Testing & Next Steps
1. **Fix Script**: Update `simulate_transactions.sh` to handle `grep` failures gracefully.
2. **Run Simulation**: Execute `bash simulate_transactions.sh`. It should populate multiple tokens with unique trade data.
3. **Verify UI**:
   - Open `/token/<canister-id>` for different tokens.
   - Confirm stats (Price, Market Cap) are different.
   - Confirm Trade History is unique to that token.
   - Test "Buy" and "Sell" buttons in the UI.

## Commands Reference

```bash
# Redeploy Backend (Wipes State)
yes | dfx deploy BondingCurve --network local --mode reinstall
dfx generate BondingCurve

# Run Simulation
bash simulate_transactions.sh
```
