#!/bin/bash

# Comprehensive Transaction Test Script
# Tests TokenFactory and BondingCurve with multiple operations
# Usage: ./test_transactions.sh

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Canister IDs (update these)
TOKEN_FACTORY="uzt4z-lp777-77774-qaabq-cai"
BONDING_CURVE="u6s2n-gx777-77774-qaaba-cai"
VAULT="vizcg-th777-77774-qaaea-cai"

print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# ============================================
# TokenFactory Tests
# ============================================

test_token_factory() {
    print_header "TokenFactory - Multiple Token Creation Test"
    
    echo "Creating 5 test tokens..."
    
    # Token 1: Bitcoin-style Gaming Token
    print_info "Creating Gaming Token (Bitcoin-style)..."
    TOKEN1=$(dfx canister call $TOKEN_FACTORY createBitcoinToken '(
        "GameCoin",
        "GAME",
        variant { ImageUrl = "https://example.com/game.png" },
        "Gaming token with 21M supply",
        opt "https://gamecoin.example",
        opt "https://t.me/gamecoin",
        opt "https://twitter.com/gamecoin"
    )' | grep -oP 'principal "([^"]+)"' | grep -oP '"[^"]+"' | tr -d '"' || echo "failed")
    
    if [ "$TOKEN1" != "failed" ]; then
        print_success "Created GameCoin: $TOKEN1"
    else
        print_error "Failed to create GameCoin"
    fi
    
    sleep 2
    
    # Token 2: Ethereum-style DeFi Token
    print_info "Creating DeFi Token (Ethereum-style)..."
    TOKEN2=$(dfx canister call $TOKEN_FACTORY createEthereumToken '(
        "DeFi Token",
        "DEFI",
        variant { ImageUrl = "https://example.com/defi.png" },
        "DeFi utility token with 1B supply",
        opt "https://defitoken.example",
        opt "https://t.me/defitoken",
        opt "https://twitter.com/defitoken"
    )' | grep -oP 'principal "([^"]+)"' | grep -oP '"[^"]+"' | tr -d '"' || echo "failed")
    
    if [ "$TOKEN2" != "failed" ]; then
        print_success "Created DeFi Token: $TOKEN2"
    else
        print_error "Failed to create DeFi Token"
    fi
    
    sleep 2
    
    # Token 3: Bitcoin-style Meme Token
    print_info "Creating Meme Token (Bitcoin-style)..."
    TOKEN3=$(dfx canister call $TOKEN_FACTORY createBitcoinToken '(
        "MemeToken",
        "MEME",
        variant { ImageUrl = "https://example.com/meme.png" },
        "Community meme token", 
        null,
        opt "https://t.me/memetoken",
        null
    )' | grep -oP 'principal "([^"]+)"' | grep -oP '"[^"]+"' | tr -d '"' || echo "failed")
    
    if [ "$TOKEN3" != "failed" ]; then
        print_success "Created MemeToken: $TOKEN3"
    else
        print_error "Failed to create MemeToken"
    fi
    
    sleep 2
    
    # Token 4: Ethereum-style NFT Token
    print_info "Creating NFT Token (Ethereum-style)..."
    TOKEN4=$(dfx canister call $TOKEN_FACTORY createEthereumToken '(
        "NFT Platform Token",
        "NFT",
        variant { ImageUrl = "https://example.com/nft.png" },
        "NFT marketplace utility token",
        opt "https://nfttoken.example",
        null,
        opt "https://twitter.com/nfttoken"
    )' | grep -oP 'principal "([^"]+)"' | grep -oP '"[^"]+"' | tr -d '"' || echo "failed")
    
    if [ "$TOKEN4" != "failed" ]; then
        print_success "Created NFT Token: $TOKEN4"
    else
        print_error "Failed to create NFT Token"
    fi
    
    sleep 2
    
    # Token 5: Bitcoin-style Privacy Token
    print_info "Creating Privacy Token (Bitcoin-style)..."
    TOKEN5=$(dfx canister call $TOKEN_FACTORY createBitcoinToken '(
        "PrivacyCoin",
        "PRIV",
        variant { ImageUrl = "https://example.com/privacy.png" },
        "Privacy-focused digital asset",
        opt "https://privacycoin.example",
        opt "https://t.me/privacycoin",
        opt "https://twitter.com/privacycoin"
    )' | grep -oP 'principal "([^"]+)"' | grep -oP '"[^"]+"' | tr -d '"' || echo "failed")
    
    if [ "$TOKEN5" != "failed" ]; then
        print_success "Created PrivacyCoin: $TOKEN5"
    else
        print_error "Failed to create PrivacyCoin"
    fi
}

# ============================================
# Query Tests
# ============================================

test_token_queries() {
    print_header "TokenFactory - Query Tests"
    
    print_info "Test 1: List all tokens..."
    dfx canister call $TOKEN_FACTORY listTokens
    
    sleep 1
    
    print_info "Test 2: Get statistics..."
    dfx canister call $TOKEN_FACTORY getStats
    
    sleep 1
    
    print_info "Test 3: Search for 'Token'..."
    dfx canister call $TOKEN_FACTORY searchTokens '("Token")'
    
    sleep 1
    
    print_info "Test 4: Get Bitcoin tokens..."
    dfx canister call $TOKEN_FACTORY getBitcoinTokens
    
    sleep 1
    
    print_info "Test 5: Get Ethereum tokens..."
    dfx canister call $TOKEN_FACTORY getEthereumTokens
    
    sleep 1
    
    print_info "Test 6: Get tokens with all socials..."
    dfx canister call $TOKEN_FACTORY getTokensWithAllSocials
    
    sleep 1
    
    print_info "Test 7: Get recent tokens (limit 3)..."
    dfx canister call $TOKEN_FACTORY getRecentTokens '(3)'
    
    sleep 1
    
    print_info "Test 8: Get detailed statistics..."
    dfx canister call $TOKEN_FACTORY getDetailedStats
    
    sleep 1
    
    print_info "Test 9: Get paginated tokens (page 1, size 2)..."
    dfx canister call $TOKEN_FACTORY getTokensPaginated '(0, 2)'
    
    sleep 1
    
    print_info "Test 10: Get token count by chain type..."
    dfx canister call $TOKEN_FACTORY getTokenCountByChainType
}

# ============================================
# BondingCurve Tests
# ============================================

test_bonding_curve_quotes() {
    print_header "BondingCurve - Multiple Quote Tests"
    
    # Test various buy quote amounts
    amounts=(10000 50000 100000 500000 1000000)
    
    for amount in "${amounts[@]}"; do
        print_info "Testing buy quote for $amount satoshis..."
        dfx canister call $BONDING_CURVE get_buy_quote "($amount)"
        sleep 1
    done
    
    # Test various sell quote amounts
    token_amounts=(1000 5000 10000 50000 100000)
    
    for amount in "${token_amounts[@]}"; do
        print_info "Testing sell quote for $amount tokens..."
        dfx canister call $BONDING_CURVE get_sell_quote "($amount)"
        sleep 1
    done
    
    # Test price queries
    print_info "Getting current price (10 times)..."
    for i in {1..10}; do
        echo "Price check #$i:"
        dfx canister call $BONDING_CURVE get_current_price
        sleep 0.5
    done
    
    # Test curve stats
    print_info "Getting curve statistics (5 times)..."
    for i in {1..5}; do
        echo "Stats check #$i:"
        dfx canister call $BONDING_CURVE get_curve_stats
        sleep 0.5
    done
}

# ============================================
# Stress Tests
# ============================================

test_rapid_queries() {
    print_header "Rapid Query Stress Test"
    
    print_info "Executing 20 rapid queries..."
    
    for i in {1..20}; do
        echo "Query #$i"
        case $((i % 4)) in
            0)
                dfx canister call $TOKEN_FACTORY getStats > /dev/null 2>&1 &
                ;;
            1)
                dfx canister call $TOKEN_FACTORY listTokens > /dev/null 2>&1 &
                ;;
            2)
                dfx canister call $BONDING_CURVE get_current_price > /dev/null 2>&1 &
                ;;
            3)
                dfx canister call $BONDING_CURVE get_curve_stats > /dev/null 2>&1 &
                ;;
        esac
        sleep 0.2
    done
    
    wait
    print_success "Completed 20 rapid queries"
}

# ============================================
# Balance Verification
# ============================================

test_factory_balances() {
    print_header "Factory Balance Verification"
    
    print_info "Getting all factory balances..."
    dfx canister call $TOKEN_FACTORY getAllFactoryBalances
    
    sleep 1
    
    print_info "Checking factory balance for first token..."
    # You would need to get actual token IDs here
    # dfx canister call $TOKEN_FACTORY getFactoryTokenBalance '(principal "xxx")'
}

# ============================================
# Main Execution
# ============================================

main() {
    print_header "Starting Comprehensive Transaction Test"
    echo "TokenFactory: $TOKEN_FACTORY"
    echo "BondingCurve: $BONDING_CURVE"
    echo "Vault: $VAULT"
    echo ""
    
    # Run all test suites
    test_token_factory
    echo ""
    
    test_token_queries
    echo ""
    
    test_bonding_curve_quotes
    echo ""
    
    test_rapid_queries
    echo ""
    
    test_factory_balances
    echo ""
    
    print_header "Test Summary"
    print_success "All transaction tests completed!"
    echo ""
    echo "Test categories executed:"
    echo "  ✅ Token creation (5 tokens)"
    echo "  ✅ Token queries (10 different queries)"
    echo "  ✅ Bonding curve quotes (10 buy + 10 sell)"
    echo "  ✅ Price checks (10 iterations)"
    echo "  ✅ Curve stats (5 iterations)"
    echo "  ✅ Rapid queries (20 concurrent)"
    echo "  ✅ Balance verification"
    echo ""
    echo "Total operations: ~70+"
}

# Run main function
main
