#!/bin/bash
# set -e
set -x

echo "=================================================="
echo "  Simulating Transactions on ALL Launched Tokens"
echo "=================================================="

NETWORK="local"

# Get canister IDs
CKBTC_ID=$(dfx canister id ckbtc_ledger --network $NETWORK)
VAULT_ID=$(dfx canister id Vault --network $NETWORK)
BONDINGCURVE_ID=$(dfx canister id BondingCurve --network $NETWORK)
TOKENFACTORY_ID=$(dfx canister id TokenFactory --network $NETWORK)

echo "Canister IDs:"
echo "  ckbtc_ledger:  $CKBTC_ID"
echo "  Vault:         $VAULT_ID"
echo "  BondingCurve:  $BONDINGCURVE_ID"
echo "  TokenFactory:  $TOKENFACTORY_ID"

# Get deployer principal
DEPLOYER=$(dfx identity get-principal)
echo "Deployer: $DEPLOYER"

# ===== STEP 1: List All Tokens =====
echo ""
echo "=================================================="
echo "  STEP 1: Listing All Launched Tokens"
echo "=================================================="

# Get all tokens and extract principals
TOKENS_RAW=$(dfx canister call TokenFactory listTokens --network $NETWORK 2>/dev/null)
echo "Raw token list: $TOKENS_RAW"

# Extract token principals using grep
TOKEN_IDS=($(echo "$TOKENS_RAW" | grep -oP 'principal "\K[^"]+'))

if [ ${#TOKEN_IDS[@]} -eq 0 ]; then
    echo "No tokens found! Create some tokens first."
    exit 1
fi

echo ""
echo "Found ${#TOKEN_IDS[@]} tokens:"
for TOKEN in "${TOKEN_IDS[@]}"; do
    # Get metadata for each token
    META=$(dfx canister call TokenFactory getTokenMetadata "(principal \"$TOKEN\")" --network $NETWORK 2>/dev/null)
    NAME=$(echo "$META" | grep -oP 'name = "\K[^"]+' || echo "Unknown")
    SYMBOL=$(echo "$META" | grep -oP 'symbol = "\K[^"]+' || echo "???")
    echo "  - $TOKEN ($NAME / $SYMBOL)"
done

# ===== STEP 2: Create/Ensure Test Users =====
echo ""
echo "=================================================="
echo "  STEP 2: Setting Up Test Users"
echo "=================================================="

NUM_USERS=5
declare -a USER_IDS
declare -a USER_PRINCIPALS

for ((i=1; i<=NUM_USERS; i++)); do
    IDENTITY="trader_$i"
    
    if ! dfx identity list | grep -q "$IDENTITY"; then
        dfx identity new $IDENTITY --storage-mode=plaintext 2>/dev/null || true
    fi
    
    PRINCIPAL=$(dfx identity get-principal --identity $IDENTITY)
    USER_IDS+=("$IDENTITY")
    USER_PRINCIPALS+=("$PRINCIPAL")
    
    echo "  User $i: $IDENTITY"
done

# ===== STEP 3: Fund Users if Needed =====
echo ""
echo "=================================================="
echo "  STEP 3: Checking/Funding Users"
echo "=================================================="

FUND_AMOUNT=10000000000  # 100 ckBTC

for ((i=0; i<NUM_USERS; i++)); do
    PRINCIPAL=${USER_PRINCIPALS[$i]}
    IDENTITY=${USER_IDS[$i]}
    
    # Check current balance
    BALANCE=$(dfx canister call ckbtc_ledger icrc1_balance_of "(record { owner = principal \"$PRINCIPAL\"; })" --network $NETWORK 2>/dev/null | grep -oP '\d+' | head -1)
    
    if [ "$BALANCE" -lt 1000000 ] 2>/dev/null; then
        echo "  Funding $IDENTITY (low balance: $BALANCE)..."
        dfx canister call ckbtc_ledger icrc1_transfer "(record { 
            to = record { owner = principal \"$PRINCIPAL\"; }; 
            amount = $FUND_AMOUNT;
        })" --network $NETWORK 2>/dev/null || echo "    Transfer failed"
    else
        echo "  $IDENTITY already funded (balance: $BALANCE)"
    fi
done

# ===== STEP 4: Ensure Users Have Approved Vault =====
echo ""
echo "=================================================="
echo "  STEP 4: Users Approving Vault"
echo "=================================================="

APPROVE_AMOUNT=100000000000  # Large approval

for ((i=0; i<NUM_USERS; i++)); do
    IDENTITY=${USER_IDS[$i]}
    
    echo "  $IDENTITY approving Vault..."
    dfx canister call ckbtc_ledger icrc2_approve "(record {
        spender = record { owner = principal \"$VAULT_ID\"; };
        amount = $APPROVE_AMOUNT;
    })" --identity $IDENTITY --network $NETWORK 2>/dev/null | grep -q "Ok" && echo "    ✓ Approved" || echo "    ✗ Failed"
done

# ===== STEP 5: Trade on Each Token =====
echo ""
echo "=================================================="
echo "  STEP 5: Trading on All Tokens"
echo "=================================================="

TOTAL_TRADES=0
SUCCESSFUL_TRADES=0

for TOKEN in "${TOKEN_IDS[@]}"; do
    echo ""
    echo "---------------------------------------------------"
    META=$(dfx canister call TokenFactory getTokenMetadata "(principal \"$TOKEN\")" --network $NETWORK 2>/dev/null)
    NAME=$(echo "$META" | grep -oP 'name = "\K[^"]+' || echo "Unknown")
    SYMBOL=$(echo "$META" | grep -oP 'symbol = "\K[^"]+' || echo "???")
    echo "  Trading: $NAME ($SYMBOL)"
    echo "  Token ID: $TOKEN"
    echo "---------------------------------------------------"
    
    echo "---------------------------------------------------"
    echo "  Trading: $NAME ($SYMBOL)"
    echo "  Token ID: $TOKEN"
    echo "---------------------------------------------------"
    
    # Initialize Curve for this token 
    # (curve_id logic: assume we can generate unique ID or use random/index? 
    #  Vault expects CurveId=Nat. We can use a hash of Principal or just 1 for simplicity if subaccounts are unique per curveId.
    #  Wait, Vault uses CurveId to derive subaccount. If we reuse CurveId=1 for all tokens, Vault will error "Curve already registered" or reuse same subaccount!
    #  We must use UNIQUE CurveId for each token.
    #  Let's generate one from the loop index or something.)
    
    # We don't have loop index readily available as proper integer here easily if using "for TOKEN".
    # Let's use a random large integer to avoid collision.
    CURVE_ID=$((1 + RANDOM % 1000000))

    echo "  Initializing Curve (ID: $CURVE_ID) for $SYMBOL..."
    
    # Call add_curve
    ADD_RES=$(dfx canister call BondingCurve add_curve "(record {
      curve_id = $CURVE_ID;
      curve_type = variant { quadratic };
      base_pair = variant { ckBTC };
      token_canister = principal \"$TOKEN\";
      initial_price = 100;
      price_at_80_percent = 10000;
      fee_percent = 100;
      min_trade_amount = 1000;
      vault_canister = principal \"$VAULT_ID\";
    })" --network $NETWORK 2>&1)
    
    if echo "$ADD_RES" | grep -q "ok"; then
        echo "  ✓ Curve initialized"
    else
        echo "  ! Curve init failed (maybe exists): $ADD_RES"
    fi
    
    # Get initial Stats/Price
    STATS=$(dfx canister call BondingCurve get_curve_stats "(principal \"$TOKEN\")" --network $NETWORK 2>/dev/null)
    PRICE=$(echo "$STATS" | grep -oP 'current_price = \K[\d.]+' || echo "0")
    echo "  Current Price: $PRICE"
    
    # Perform BUY transactions
    echo ""
    echo "  --- BUY Transactions ---"
    for ((round=1; round<=3; round++)); do
        USER_IDX=$((RANDOM % NUM_USERS))
        IDENTITY=${USER_IDS[$USER_IDX]}
        BUY_AMOUNT=$((10000 + RANDOM % 50000))
        
        ((TOTAL_TRADES++))
        
        RESULT=$(dfx canister call BondingCurve buy "(principal \"$TOKEN\", $BUY_AMOUNT)" --identity $IDENTITY --network $NETWORK 2>&1) || true
        
        if echo "$RESULT" | grep -q "ok"; then
            TOKENS=$(echo "$RESULT" | grep -oP '\d+' | head -1)
            echo "    [$round] $IDENTITY bought $TOKENS tokens for $BUY_AMOUNT sats ✓"
            ((SUCCESSFUL_TRADES++))
        else
            ERROR=$(echo "$RESULT" | grep -oP 'err = "\K[^"]+' || echo "$RESULT")
            echo "    [$round] $IDENTITY buy failed: $ERROR"
        fi
    done
    
    # Get stats after buys
    STATS=$(dfx canister call BondingCurve get_curve_stats "(principal \"$TOKEN\")" --network $NETWORK 2>/dev/null)
    MINTED=$(echo "$STATS" | grep -oP 'tokens_minted = \K[\d_]+' | tr -d '_')
    RAISED=$(echo "$STATS" | grep -oP 'total_base_raised = \K[\d_]+' | tr -d '_')
    PRICE=$(echo "$STATS" | grep -oP 'current_price = \K[\d.]+')
    
    echo ""
    echo "  After Buys: Minted=$MINTED, Raised=$RAISED sats, Price=$PRICE"
    
    # Perform SELL transactions
    echo ""
    echo "  --- SELL Transactions ---"
    HOLDERS=$(dfx canister call BondingCurve get_holders "(principal \"$TOKEN\")" --network $NETWORK 2>/dev/null)
    
    for ((round=1; round<=2; round++)); do
        USER_IDX=$((RANDOM % NUM_USERS))
        IDENTITY=${USER_IDS[$USER_IDX]}
        PRINCIPAL=${USER_PRINCIPALS[$USER_IDX]}
        
        # Get user's token balance (Shadow Balance in Curve)
        # Using get_holders to find balance because get_user_balance helper might be missing
        USER_BALANCE=$(dfx canister call BondingCurve get_holders "(principal \"$TOKEN\")" --network $NETWORK 2>/dev/null | grep -A 1 "$PRINCIPAL" | grep -oP '\d+' | head -1 || echo "0")
        
        if [ -z "$USER_BALANCE" ] || [ "$USER_BALANCE" -eq 0 ] 2>/dev/null; then
            echo "    [$round] $IDENTITY has no tokens to sell"
            continue
        fi
        
        # Sell half their tokens
        SELL_AMOUNT=$((USER_BALANCE / 2))
        if [ "$SELL_AMOUNT" -lt 10 ]; then
            echo "    [$round] $IDENTITY balance too low ($USER_BALANCE)"
            continue
        fi
        
        ((TOTAL_TRADES++))
        
        RESULT=$(dfx canister call BondingCurve sell "(principal \"$TOKEN\", $SELL_AMOUNT)" --identity $IDENTITY --network $NETWORK 2>&1) || true
        
        if echo "$RESULT" | grep -q "ok"; then
            RECEIVED=$(echo "$RESULT" | grep -oP '\d+' | head -1)
            echo "    [$round] $IDENTITY sold $SELL_AMOUNT tokens for $RECEIVED sats ✓"
            ((SUCCESSFUL_TRADES++))
        else
            ERROR=$(echo "$RESULT" | grep -oP 'err = "\K[^"]+' || echo "$RESULT")
            echo "    [$round] $IDENTITY sell failed: $ERROR"
        fi
    done
    
    # Final stats for this token
    echo ""
    FINAL_STATS=$(dfx canister call BondingCurve get_curve_stats "(principal \"$TOKEN\")" --network $NETWORK 2>/dev/null)
    MINTED=$(echo "$FINAL_STATS" | grep -oP 'tokens_minted = \K[\d_]+' | tr -d '_')
    RAISED=$(echo "$FINAL_STATS" | grep -oP 'total_base_raised = \K[\d_]+' | tr -d '_')
    PRICE=$(echo "$FINAL_STATS" | grep -oP 'current_price = \K[\d.]+')
    
    echo "  FINAL for $SYMBOL: Minted=$MINTED, Raised=$RAISED sats, Price=$PRICE"
    
    sleep 1
done

# ===== Summary =====
echo ""
echo "=================================================="
echo "                SIMULATION SUMMARY"
echo "=================================================="
echo "Total Tokens Traded: ${#TOKEN_IDS[@]}"
echo "Total Trades Attempted: $TOTAL_TRADES"
echo "Successful Trades: $SUCCESSFUL_TRADES"
echo ""
echo "Tokens traded:"
for TOKEN in "${TOKEN_IDS[@]}"; do
    META=$(dfx canister call TokenFactory getTokenMetadata "(principal \"$TOKEN\")" --network $NETWORK 2>/dev/null)
    NAME=$(echo "$META" | grep -oP 'name = "\K[^"]+' || echo "Unknown")
    SYMBOL=$(echo "$META" | grep -oP 'symbol = "\K[^"]+' || echo "???")
    echo "  - $NAME ($SYMBOL): http://localhost:5173/Token/swap/$TOKEN"
done
echo ""
echo "=================================================="
