#!/bin/bash
set -e

echo "=================================================="
echo "  Deploying and Testing Comments Canister"
echo "=================================================="

NETWORK="local"

# 1. Deploy Comments Canister
echo ""
echo "=== STEP 1: Deploying Comments Canister ==="
dfx deploy Comments --network $NETWORK --yes 2>/dev/null || echo "Already deployed or failed to upgrade"
COMMENTS_ID=$(dfx canister id Comments --network $NETWORK)
echo "Comments Canister ID: $COMMENTS_ID"

# 2. Get Tokens
echo ""
echo "=== STEP 2: Fetching Existing Tokens ==="
TOKEN_IDS=($(dfx canister call TokenFactory listTokens --network $NETWORK 2>/dev/null | grep -oP 'principal "\K[^"]+'))

if [ ${#TOKEN_IDS[@]} -eq 0 ]; then
    echo "No tokens found! Run ./simulate_transactions.sh first."
    exit 1
fi
echo "Found tokens: ${TOKEN_IDS[@]}"

# 3. Simulate Comments
echo ""
echo "=== STEP 3: Simulating Comments for Each Token ==="

# Define messages
MESSAGES=(
  "This token is going to the moon! 🚀"
  "Just bought the dip!"
  "When graduation?"
  "HODL strong apes!"
  "Great project, loving the bonding curve mechanics."
  "Is the dev based?"
  "LFG! 🔥"
  "Selling my house to buy more."
)

NUM_USERS=5
declare -a USER_IDS=("trader_1" "trader_2" "trader_3" "trader_4" "trader_5")

for TOKEN_ID in "${TOKEN_IDS[@]}"; do
    echo ""
    echo "---------------------------------------------------"
    echo "  Posting comments for Token: $TOKEN_ID"
    echo "---------------------------------------------------"
    
    # Post 5 random comments per token
    for ((i=1; i<=5; i++)); do
        USER_IDX=$((RANDOM % NUM_USERS))
        IDENTITY=${USER_IDS[$USER_IDX]}
        MSG_IDX=$((RANDOM % ${#MESSAGES[@]}))
        MSG=${MESSAGES[$MSG_IDX]}
        
        echo "  $IDENTITY posting: \"$MSG\""
        dfx canister call Comments postComment "(
          \"$TOKEN_ID\", 
          \"$MSG\"
        )" --identity $IDENTITY --network $NETWORK >/dev/null
    done
    
    # 4. Verify Comments
    echo ""
    echo "  > Verifying comments for $TOKEN_ID..."
    COUNT=$(dfx canister call Comments getCommentCount "(\"$TOKEN_ID\")" --network $NETWORK | grep -oP '\d+')
    echo "    Total Comments: $COUNT"
    
    echo "    Fetching last 3 comments:"
    dfx canister call Comments getComments "(\"$TOKEN_ID\")" --network $NETWORK | tail -10
done

echo ""
echo "=================================================="
echo "  COMMENTS SIMULATION COMPLETE"
echo "=================================================="
