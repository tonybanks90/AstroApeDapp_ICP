#!/bin/bash
set -e

echo "=================================================="
echo "  Deploy & Test: TokenFactory, BondingCurve, Vault"
echo "=================================================="

NETWORK="local"

# ===== STEP 0: Identity Setup =====
echo ""
echo "=== STEP 0: Identity Setup ==="
dfx identity use default
DEPLOYER=$(dfx identity get-principal)
echo "Using identity: default"
echo "Deployer Principal: $DEPLOYER"

# ===== STEP 1: Check/Start Replica =====
echo ""
echo "=== STEP 1: Checking Replica ==="
if ! dfx ping $NETWORK 2>/dev/null; then
    echo "Replica not running. Starting with --clean..."
    dfx start --clean --background
    sleep 3
fi

if dfx ping $NETWORK; then
    echo "✓ Replica is healthy"
else
    echo "✗ Failed to start replica"
    exit 1
fi

# ===== STEP 2: Create Canisters =====
echo ""
echo "=== STEP 2: Creating Canisters ==="

# Create canisters if they don't exist
dfx canister create ckbtc_ledger --network $NETWORK 2>/dev/null || echo "ckbtc_ledger already exists"
dfx canister create Vault --network $NETWORK 2>/dev/null || echo "Vault already exists"
dfx canister create TokenFactory --network $NETWORK 2>/dev/null || echo "TokenFactory already exists"
dfx canister create BondingCurve --network $NETWORK 2>/dev/null || echo "BondingCurve already exists"

# Get canister IDs
CKBTC_ID=$(dfx canister id ckbtc_ledger --network $NETWORK)
VAULT_ID=$(dfx canister id Vault --network $NETWORK)
TOKENFACTORY_ID=$(dfx canister id TokenFactory --network $NETWORK)
BONDINGCURVE_ID=$(dfx canister id BondingCurve --network $NETWORK)

echo ""
echo "Canister IDs:"
echo "  ckbtc_ledger:  $CKBTC_ID"
echo "  Vault:         $VAULT_ID"
echo "  TokenFactory:  $TOKENFACTORY_ID"
echo "  BondingCurve:  $BONDINGCURVE_ID"

# ===== STEP 3: Check Controller Permissions =====
echo ""
echo "=== STEP 3: Checking Controller Permissions ==="

check_controller() {
    CANISTER_NAME=$1
    CANISTER_ID=$2
    INFO=$(dfx canister info $CANISTER_NAME --network $NETWORK 2>&1 || true)
    if echo "$INFO" | grep -q "$DEPLOYER"; then
        echo "✓ $CANISTER_NAME: You ARE a controller"
        return 0
    else
        echo "✗ $CANISTER_NAME: You are NOT a controller"
        echo "  Controllers: $(echo "$INFO" | grep -i 'controller' || echo 'unknown')"
        return 1
    fi
}

CONTROLLER_OK=true
check_controller "ckbtc_ledger" "$CKBTC_ID" || CONTROLLER_OK=false
check_controller "Vault" "$VAULT_ID" || CONTROLLER_OK=false
check_controller "TokenFactory" "$TOKENFACTORY_ID" || CONTROLLER_OK=false
check_controller "BondingCurve" "$BONDINGCURVE_ID" || CONTROLLER_OK=false

if [ "$CONTROLLER_OK" = false ]; then
    echo ""
    echo "WARNING: Controller issues detected!"
    echo "Attempting to fix by stopping dfx and restarting with --clean..."
    dfx stop
    sleep 2
    dfx start --clean --background
    sleep 3
    
    # Re-create canisters
    dfx canister create ckbtc_ledger --network $NETWORK
    dfx canister create Vault --network $NETWORK
    dfx canister create TokenFactory --network $NETWORK
    dfx canister create BondingCurve --network $NETWORK
    
    # Update IDs
    CKBTC_ID=$(dfx canister id ckbtc_ledger --network $NETWORK)
    VAULT_ID=$(dfx canister id Vault --network $NETWORK)
    TOKENFACTORY_ID=$(dfx canister id TokenFactory --network $NETWORK)
    BONDINGCURVE_ID=$(dfx canister id BondingCurve --network $NETWORK)
    
    echo "New Canister IDs after clean restart:"
    echo "  ckbtc_ledger:  $CKBTC_ID"
    echo "  Vault:         $VAULT_ID"
    echo "  TokenFactory:  $TOKENFACTORY_ID"
    echo "  BondingCurve:  $BONDINGCURVE_ID"
fi

# ===== STEP 4: Deploy ckbtc_ledger =====
echo ""
echo "=== STEP 4: Deploying ckbtc_ledger ==="
dfx deploy ckbtc_ledger --network $NETWORK --argument "(variant {Init = record {
  token_symbol = \"ckBTC\";
  token_name = \"Chain Key Bitcoin\";
  minting_account = record { owner = principal \"$DEPLOYER\" };
  transfer_fee = 10;
  metadata = vec {};
  feature_flags = opt record{ icrc2 = true };
  initial_balances = vec { record { record { owner = principal \"$DEPLOYER\"; }; 100000000000; } };
  archive_options = record {
    num_blocks_to_archive = 1000;
    trigger_threshold = 2000;
    controller_id = principal \"$DEPLOYER\";
    cycles_for_archive_creation = opt 10000000000000;
  };
}})"

echo "✓ ckbtc_ledger deployed"

# ===== STEP 5: Deploy Vault =====
echo ""
echo "=== STEP 5: Deploying Vault ==="
dfx deploy Vault --network $NETWORK
echo "✓ Vault deployed"

# ===== STEP 6: Deploy TokenFactory =====
echo ""
echo "=== STEP 6: Deploying TokenFactory ==="
dfx deploy TokenFactory --network $NETWORK
echo "✓ TokenFactory deployed"

# Top up cycles
echo "Topping up TokenFactory cycles..."
dfx ledger fabricate-cycles --canister TokenFactory --cycles 10000000000000 --network $NETWORK || echo "Fabricate cycles not available"

# ===== STEP 7: Upload WASM to TokenFactory =====
echo ""
echo "=== STEP 7: Uploading WASM to TokenFactory ==="
node uploadWasm.mjs || echo "WASM upload failed - token creation may not work"

# ===== STEP 8: Deploy BondingCurve =====
echo ""
echo "=== STEP 8: Deploying BondingCurve ==="
dfx deploy BondingCurve --network $NETWORK --argument "(record {
  curve_id = 0;
  curve_type = variant { linear };
  base_pair = variant { ckBTC };
  token_canister = principal \"aaaaa-aa\";
  initial_price = 1;
  price_at_80_percent = 10;
  fee_percent = 100;
  min_trade_amount = 1;
  vault_canister = principal \"$VAULT_ID\";
})"
echo "✓ BondingCurve deployed"

# ===== STEP 8: Tests =====
echo ""
echo "=================================================="
echo "                    TESTS                         "
echo "=================================================="

TEST_PASSED=0
TEST_FAILED=0

run_test() {
    TEST_NAME=$1
    TEST_CMD=$2
    EXPECTED=$3
    
    echo ""
    echo "TEST: $TEST_NAME"
    RESULT=$(eval "$TEST_CMD" 2>&1) || true
    
    if echo "$RESULT" | grep -q "$EXPECTED"; then
        echo "  ✓ PASSED"
        ((TEST_PASSED++))
    else
        echo "  ✗ FAILED"
        echo "  Expected to contain: $EXPECTED"
        echo "  Got: $RESULT"
        ((TEST_FAILED++))
    fi
}

# Test 1: ckbtc_ledger balance
run_test "ckBTC Deployer Balance" \
    "dfx canister call ckbtc_ledger icrc1_balance_of '(record { owner = principal \"$DEPLOYER\"; })' --network $NETWORK" \
    "100_000_000_000"

# Test 2: ckbtc_ledger symbol
run_test "ckBTC Token Symbol" \
    "dfx canister call ckbtc_ledger icrc1_symbol --network $NETWORK" \
    "ckBTC"

# Test 3: Vault set ledger
run_test "Vault Set Ledger" \
    "dfx canister call Vault set_ledger_id '(variant { ckBTC }, principal \"$CKBTC_ID\")' --network $NETWORK" \
    "ok"

# Test 4: TokenFactory set BondingCurve
run_test "TokenFactory Set BondingCurve" \
    "dfx canister call TokenFactory setBondingCurve '(principal \"$BONDINGCURVE_ID\")' --network $NETWORK" \
    "ok"

# Test 5: BondingCurve get stats
run_test "BondingCurve Get Stats" \
    "dfx canister call BondingCurve get_curve_stats --network $NETWORK" \
    "tokens_minted"

# Test 6: Create a test token
echo ""
echo "TEST: Create Token via TokenFactory"
CREATE_RESULT=$(dfx canister call TokenFactory createIcrc2Token '(
  "TestCoin", 
  "TEST", 
  variant { ImageUrl = "https://example.com/logo.png" }, 
  "A test token", 
  opt "", 
  opt "", 
  opt "" 
)' --network $NETWORK 2>&1) || true

if echo "$CREATE_RESULT" | grep -q "principal"; then
    echo "  ✓ PASSED - Token created"
    TOKEN_ID=$(echo "$CREATE_RESULT" | grep -oP 'principal "\K[^"]+' || echo "unknown")
    echo "  Token ID: $TOKEN_ID"
    ((TEST_PASSED++))
else
    echo "  ✗ FAILED"
    echo "  Result: $CREATE_RESULT"
    ((TEST_FAILED++))
fi

# ===== Summary =====
echo ""
echo "=================================================="
echo "                   SUMMARY                        "
echo "=================================================="
echo "Tests Passed: $TEST_PASSED"
echo "Tests Failed: $TEST_FAILED"
echo ""
echo "Canister IDs (for .env):"
echo "CANISTER_ID_CKBTC_LEDGER=$CKBTC_ID"
echo "CANISTER_ID_VAULT=$VAULT_ID"
echo "CANISTER_ID_TOKENFACTORY=$TOKENFACTORY_ID"
echo "CANISTER_ID_BONDINGCURVE=$BONDINGCURVE_ID"

if [ "$TEST_FAILED" -eq 0 ]; then
    echo ""
    echo "✓ All tests passed! Environment is ready."
    exit 0
else
    echo ""
    echo "✗ Some tests failed. Review the output above."
    exit 1
fi
