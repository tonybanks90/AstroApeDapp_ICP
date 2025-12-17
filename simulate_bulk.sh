#!/bin/bash
# Bulk Transaction Simulator - 50 trades per token
# This script simulates many buy/sell transactions to generate chart data

NETWORK="local"
TRADES_PER_TOKEN=50

echo "=================================================="
echo "  BULK TRANSACTION SIMULATOR"
echo "  $TRADES_PER_TOKEN trades per token"
echo "=================================================="

# Get canister IDs
CKBTC_ID=$(dfx canister id ckbtc_ledger --network $NETWORK)
VAULT_ID=$(dfx canister id Vault --network $NETWORK)
BONDINGCURVE_ID=$(dfx canister id BondingCurve --network $NETWORK)
TOKENFACTORY_ID=$(dfx canister id TokenFactory --network $NETWORK)

echo "BondingCurve: $BONDINGCURVE_ID"
echo "Vault: $VAULT_ID"

# Setup traders
NUM_USERS=5
declare -a USER_IDS=("trader_1" "trader_2" "trader_3" "trader_4" "trader_5")
declare -a USER_PRINCIPALS

echo ""
echo "=== Setting up traders ==="
for ((i=0; i<NUM_USERS; i++)); do
    IDENTITY=${USER_IDS[$i]}
    
    # Create identity if needed
    dfx identity list | grep -q "$IDENTITY" || dfx identity new $IDENTITY --storage-mode=plaintext 2>/dev/null
    
    PRINCIPAL=$(dfx identity get-principal --identity $IDENTITY)
    USER_PRINCIPALS+=("$PRINCIPAL")
    
    # Check balance and fund if needed
    BALANCE=$(dfx canister call ckbtc_ledger icrc1_balance_of "(record { owner = principal \"$PRINCIPAL\"; })" --network $NETWORK 2>/dev/null | grep -oP '\d+' | head -1 || echo "0")
    
    if [ "$BALANCE" -lt 1000000000 ] 2>/dev/null; then
        echo "  Funding $IDENTITY..."
        dfx canister call ckbtc_ledger icrc1_transfer "(record { 
            to = record { owner = principal \"$PRINCIPAL\"; }; 
            amount = 50000000000;
        })" --network $NETWORK 2>/dev/null | head -1
    fi
    
    # Approve vault
    dfx canister call ckbtc_ledger icrc2_approve "(record {
        spender = record { owner = principal \"$VAULT_ID\"; };
        amount = 100000000000;
    })" --identity $IDENTITY --network $NETWORK 2>/dev/null | grep -q "Ok" || true
    
    echo "  ✓ $IDENTITY ready"
done

# Get all tokens
echo ""
echo "=== Getting tokens ==="
TOKEN_IDS=($(dfx canister call TokenFactory listTokens --network $NETWORK 2>/dev/null | grep -oP 'principal "\K[^"]+'))

if [ ${#TOKEN_IDS[@]} -eq 0 ]; then
    echo "No tokens found!"
    exit 1
fi

echo "Found ${#TOKEN_IDS[@]} tokens"

# Trade on each token
for TOKEN in "${TOKEN_IDS[@]}"; do
    echo ""
    echo "=================================================="
    META=$(dfx canister call TokenFactory getTokenMetadata "(principal \"$TOKEN\")" --network $NETWORK 2>/dev/null)
    NAME=$(echo "$META" | grep -oP 'name = "\K[^"]+' || echo "Unknown")
    SYMBOL=$(echo "$META" | grep -oP 'symbol = "\K[^"]+' || echo "???")
    echo "  Token: $NAME ($SYMBOL)"
    echo "  ID: $TOKEN"
    echo "=================================================="
    
    # Configure BondingCurve for this token
    echo "Configuring BondingCurve..."
    dfx deploy BondingCurve --network $NETWORK --mode reinstall --yes --argument "(record {
      curve_id = 1;
      curve_type = variant { quadratic };
      base_pair = variant { ckBTC };
      token_canister = principal \"$TOKEN\";
      initial_price = 100;
      price_at_80_percent = 10000;
      fee_percent = 100;
      min_trade_amount = 1000;
      vault_canister = principal \"$VAULT_ID\";
    })" 2>&1 | tail -2
    
    # Initialize and register
    dfx canister call Vault initialize "(principal \"$BONDINGCURVE_ID\")" --network $NETWORK 2>/dev/null || true
    dfx canister call BondingCurve registerWithVault --network $NETWORK 2>/dev/null | grep -q "ok" && echo "✓ Registered" || true
    
    echo ""
    echo "Running $TRADES_PER_TOKEN trades..."
    
    BUYS=0
    SELLS=0
    
    for ((t=1; t<=TRADES_PER_TOKEN; t++)); do
        USER_IDX=$((RANDOM % NUM_USERS))
        IDENTITY=${USER_IDS[$USER_IDX]}
        PRINCIPAL=${USER_PRINCIPALS[$USER_IDX]}
        
        # 70% buys, 30% sells
        if [ $((RANDOM % 100)) -lt 70 ]; then
            # BUY
            AMOUNT=$((5000 + RANDOM % 45000))
            RESULT=$(dfx canister call BondingCurve buy "($AMOUNT)" --identity $IDENTITY --network $NETWORK 2>&1)
            
            if echo "$RESULT" | grep -q "ok"; then
                ((BUYS++))
                printf "\r  Progress: %d/%d (Buys: %d, Sells: %d)  " $t $TRADES_PER_TOKEN $BUYS $SELLS
            fi
        else
            # SELL
            BALANCE=$(dfx canister call BondingCurve get_user_balance "(principal \"$PRINCIPAL\")" --network $NETWORK 2>/dev/null | grep -oP '\d+' | head -1 || echo "0")
            
            if [ "$BALANCE" -gt 10 ] 2>/dev/null; then
                SELL_AMOUNT=$((BALANCE / 4 + 1))
                RESULT=$(dfx canister call BondingCurve sell "($SELL_AMOUNT)" --identity $IDENTITY --network $NETWORK 2>&1)
                
                if echo "$RESULT" | grep -q "ok"; then
                    ((SELLS++))
                    printf "\r  Progress: %d/%d (Buys: %d, Sells: %d)  " $t $TRADES_PER_TOKEN $BUYS $SELLS
                fi
            fi
        fi
        
        # Small delay to space out timestamps
        sleep 0.1
    done
    
    echo ""
    echo ""
    
    # Final stats
    STATS=$(dfx canister call BondingCurve get_curve_stats --network $NETWORK 2>/dev/null)
    MINTED=$(echo "$STATS" | grep -oP 'tokens_minted = \K[\d_]+' | tr -d '_')
    RAISED=$(echo "$STATS" | grep -oP 'total_base_raised = \K[\d_]+' | tr -d '_')
    PRICE=$(echo "$STATS" | grep -oP 'current_price = \K[\d.]+')
    
    TRADE_COUNT=$(dfx canister call BondingCurve get_recent_trades --network $NETWORK 2>/dev/null | grep -c "trade_type")
    
    echo "  Results for $SYMBOL:"
    echo "    Buys: $BUYS"
    echo "    Sells: $SELLS"
    echo "    Recorded Trades: $TRADE_COUNT"
    echo "    Tokens Minted: $MINTED"
    echo "    Total Raised: $RAISED sats"
    echo "    Current Price: $PRICE"
    echo "    URL: http://localhost:5173/Token/swap/$TOKEN"
done

echo ""
echo "=================================================="
echo "  SIMULATION COMPLETE!"
echo "=================================================="
echo ""
echo "Token swap pages:"
for TOKEN in "${TOKEN_IDS[@]}"; do
    META=$(dfx canister call TokenFactory getTokenMetadata "(principal \"$TOKEN\")" --network $NETWORK 2>/dev/null)
    SYMBOL=$(echo "$META" | grep -oP 'symbol = "\K[^"]+' || echo "???")
    echo "  $SYMBOL: http://localhost:5173/Token/swap/$TOKEN"
done
