#!/bin/bash

# Configuration
CKBTC_LEDGER_CANISTER="ckbtc_ledger"
VAULT_CANISTER="Vault"
BONDING_CURVE_CANISTER="BondingCurve"
TOKEN_FACTORY_CANISTER="TokenFactory"
NUM_USERS=10
MINT_AMOUNT=1000000000 # 10 BTC (satoshis) per user
TRADE_AMOUNT_MIN=1000
TRADE_AMOUNT_MAX=50000

echo "=================================================="
echo "      Starting User Simulation & Stress Test"
echo "=================================================="

# 1. Setup Local ckBTC Ledger
echo "Please ensure you have deployed: dfx deploy $CKBTC_LEDGER_CANISTER"
CKBTC_ID=$(dfx canister id $CKBTC_LEDGER_CANISTER)
echo "ckBTC Ledger ID: $CKBTC_ID"

# Debug Default Identity
DEFAULT_PRINCIPAL=$(dfx identity get-principal --identity default)
echo "Default Identity (Minter): $DEFAULT_PRINCIPAL"
BALANCE=$(dfx canister call $CKBTC_LEDGER_CANISTER icrc1_balance_of "(record { owner = principal \"$DEFAULT_PRINCIPAL\"; })" --identity default)
echo "Default Identity Balance: $BALANCE"

# 2. Configure Vault
echo "Configuring Vault..."
echo "Setting ckBTC ledger..."
dfx canister call $VAULT_CANISTER set_ledger_id "(variant { ckBTC }, principal \"$CKBTC_ID\")"
echo "Initializing Vault with BondingCurve..."
BONDING_CURVE_ID=$(dfx canister id $BONDING_CURVE_CANISTER)
dfx canister call $VAULT_CANISTER initialize "(principal \"$BONDING_CURVE_ID\")"


# 3. Create Users and Mint ckBTC
echo "Creating $NUM_USERS users and minting ckBTC..."
IDS=()
PRINCIPALS=()

for ((i=1; i<=NUM_USERS; i++)); do
    IDENTITY="user_sim_$i"
    
    # Create identity if not exists
    if ! dfx identity list | grep -q "$IDENTITY"; then
        dfx identity new $IDENTITY --storage-mode=plaintext || true
    fi
    
    PRINCIPAL=$(dfx identity get-principal --identity $IDENTITY)
    IDS+=("$IDENTITY")
    PRINCIPALS+=("$PRINCIPAL")
    
    echo "User $i ($IDENTITY): $PRINCIPAL"
    
    # Mint ckBTC to user
    # Note: Local icrc1_ledger usually supports minting via a specific minter identity or args
    # For simplicity, assuming the default identity is the minter or has minting power
    # Check if we need to switch identity to mint
    
    echo "Minting $MINT_AMOUNT satoshis to $IDENTITY..."
    dfx canister call $CKBTC_LEDGER_CANISTER icrc1_transfer "(record { 
        to = record { owner = principal \"$PRINCIPAL\"; }; 
        amount = $MINT_AMOUNT;
    })" --identity default
done

# 4. Configure TokenFactory and Create Token
echo "Configuring TokenFactory with BondingCurve ID..."
BONDING_CURVE_ID=$(dfx canister id $BONDING_CURVE_CANISTER)
dfx canister call $TOKEN_FACTORY_CANISTER setBondingCurve "(principal \"$BONDING_CURVE_ID\")"

echo "Creating a target token for trading (AstroCoin)..."
# Switch to a user to create a token
dfx identity use ${IDS[0]}
CREATION_RESULT=$(dfx canister call $TOKEN_FACTORY_CANISTER createIcrc2Token '(
  "AstroCoin", 
  "ASTRO", 
  variant { ImageUrl = "https://cryptologos.cc/logos/cosmos-atom-logo.png" }, 
  "The official token of the AstroApe platform", 
  opt "", 
  opt "", 
  opt "" 
)')
echo "Creation Result: $CREATION_RESULT"

# Extract Token Principal using grep/sed
TOKEN_ID=$(echo "$CREATION_RESULT" | grep -oP 'principal "\K[^"]+')

if [ -z "$TOKEN_ID" ]; then
    echo "Failed to extract Token ID. Exiting."
    exit 1
fi

echo "Created Token ID: $TOKEN_ID"

# 4a. Redeploy BondingCurve to manage this new token (Reinstall to reset state)
echo "Redeploying BondingCurve to manage $TOKEN_ID..."
dfx identity use default
VAULT_ID=$(dfx canister id $VAULT_CANISTER)
dfx deploy $BONDING_CURVE_CANISTER --mode reinstall --yes --argument "(record {
  curve_id = 1;
  curve_type = variant { linear };
  base_pair = variant { ckBTC };
  token_canister = principal \"$TOKEN_ID\";
  initial_price = 100;
  price_at_80_percent = 10000;
  fee_percent = 100;
  min_trade_amount = 100;
  vault_canister = principal \"$VAULT_ID\";
})"

# 4b. Register BondingCurve with Vault
echo "Registering BondingCurve with Vault..."
dfx canister call $BONDING_CURVE_CANISTER registerWithVault

# 5. Simulate Trading Loop
echo "Starting trading loop..."

# Approve Vault to spend ckBTC for each user
for ((i=0; i<NUM_USERS; i++)); do
    ID=${IDS[$i]}
    
    echo "User $ID approving Vault..."
    dfx canister call $CKBTC_LEDGER_CANISTER icrc2_approve "(record {
        spender = record { owner = principal \"$VAULT_ID\"; };
        amount = $MINT_AMOUNT;
    })" --identity $ID
done

# Loop for random trades
for ((r=1; r<=20; r++)); do
    USER_IDX=$((RANDOM % NUM_USERS))
    ID=${IDS[$USER_IDX]}
    AMOUNT=$((RANDOM % (TRADE_AMOUNT_MAX - TRADE_AMOUNT_MIN) + TRADE_AMOUNT_MIN))
    
    # 50/50 Buy or Sell
    if (( RANDOM % 2 == 0 )); then
        ACTION="buy"
    else
        ACTION="sell"
    fi
    
    echo "[$r] User $ID performing $ACTION of $AMOUNT..."
    
    if [ "$ACTION" == "buy" ]; then
         dfx canister call $BONDING_CURVE_CANISTER buy "(
            $AMOUNT
         )" --identity $ID
    else
         dfx canister call $BONDING_CURVE_CANISTER sell "(
            $AMOUNT
         )" --identity $ID
    fi
    
    sleep 0.5
done

echo "Simulation Complete!"
echo ""
echo "=================================================="
echo "Visit the Swap Page for ASTRO Coin:"
echo "http://localhost:5173/Token/swap/$TOKEN_ID"
echo "=================================================="
dfx identity use default
