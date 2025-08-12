#!/bin/bash

# Bonding Curve Deployment and Testing Script
# Usage: ./bonding.sh [command]
# Commands: deploy, test, buy, sell, stats, approve

set -e  # Exit on any error

# Configuration
CKBTC_CANISTER="mxzaz-hqaaa-aaaar-qaada-cai"
TOKEN_CANISTER="un4fu-tqaaa-aaaab-qadjq-cai"
BONDING_CURVE_CANISTER=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

get_principal() {
    dfx identity get-principal
}

deploy_bonding_curve() {
    print_header "Deploying Bonding Curve Contract"
    
    echo "Deploying to playground..."
    
    dfx deploy BondingCurve --playground --argument "(
        record {
            curve_type = variant { quadratic };
            ckbtc_canister = principal \"$CKBTC_CANISTER\";
            token_canister = principal \"$TOKEN_CANISTER\";
            max_supply = 1000000000;
            initial_price = 1000;
            price_at_80_percent = 100000;
            fee_percent = 300;
            min_trade_amount = 10000;
            graduation_threshold = 800000000;
        }
    )"
    
    # Get the deployed canister ID
    BONDING_CURVE_CANISTER=$(dfx canister id BondingCurve --playground)
    print_success "Bonding curve deployed at: $BONDING_CURVE_CANISTER"
    
    echo "BONDING_CURVE_CANISTER=\"$BONDING_CURVE_CANISTER\"" > .bonding_env
    print_success "Canister ID saved to .bonding_env"
}

load_canister_id() {
    if [ -f ".bonding_env" ]; then
        source .bonding_env
    else
        BONDING_CURVE_CANISTER=$(dfx canister id BondingCurve --playground 2>/dev/null || echo "")
    fi
    
    if [ -z "$BONDING_CURVE_CANISTER" ]; then
        print_error "Bonding curve canister not found. Please deploy first."
        exit 1
    fi
}

check_ckbtc_balance() {
    print_header "Checking ckBTC Balance"
    
    local principal=$(get_principal)
    echo "Principal: $principal"
    
    local balance=$(dfx canister call $CKBTC_CANISTER icrc1_balance_of "(
        record {
            owner = principal \"$principal\";
            subaccount = null;
        }
    )" --playground)
    
    echo "ckBTC Balance: $balance satoshis"
    
    # Convert to BTC for readability
    local balance_num=$(echo $balance | grep -o '[0-9]*')
    if [ -n "$balance_num" ] && [ "$balance_num" -gt 0 ]; then
        local btc_amount=$(echo "scale=8; $balance_num / 100000000" | bc -l)
        echo "           = $btc_amount ckBTC"
    else
        print_warning "You have 0 ckBTC balance!"
        echo ""
        echo "To get test ckBTC, you can:"
        echo "1. Use the ckBTC faucet (if available on playground)"
        echo "2. Transfer from another account"
        echo "3. Use a different test token"
        echo ""
        echo "For playground testing, try using a test token instead of ckBTC:"
        echo "  - Deploy your own ICRC2 token with initial supply"
        echo "  - Or use an existing test token"
    fi
}

approve_spending() {
    print_header "Approving ckBTC Spending"
    
    local amount=${1:-1000000}  # Default 0.01 ckBTC
    echo "Approving $amount satoshis for spending..."
    
    # Check balance first
    local principal=$(get_principal)
    local balance=$(dfx canister call $CKBTC_CANISTER icrc1_balance_of "(
        record {
            owner = principal \"$principal\";
            subaccount = null;
        }
    )" --playground | grep -o '[0-9]*')
    
    if [ "$balance" -eq 0 ]; then
        print_error "Cannot approve - you have 0 ckBTC balance!"
        echo "You need to get ckBTC first. See the 'get-test-tokens' command."
        return 1
    fi
    
    if [ "$balance" -lt "$amount" ]; then
        print_warning "You're trying to approve $amount sats but only have $balance sats"
        amount=$balance
        echo "Adjusting approval to your full balance: $amount sats"
    fi
    
    dfx canister call $CKBTC_CANISTER icrc2_approve "(
        record {
            from_subaccount = null;
            spender = record {
                owner = principal \"$BONDING_CURVE_CANISTER\";
                subaccount = null;
            };
            amount = $amount;
            expected_allowance = null;
            expires_at = null;
            fee = null;
            memo = null;
            created_at_time = null;
        }
    )" --playground
    
    print_success "Approval complete"
}

check_allowance() {
    print_header "Checking Allowance"
    
    local principal=$(get_principal)
    
    dfx canister call $CKBTC_CANISTER icrc2_allowance "(
        record {
            account = record {
                owner = principal \"$principal\";
                subaccount = null;
            };
            spender = record {
                owner = principal \"$BONDING_CURVE_CANISTER\";
                subaccount = null;
            };
        }
    )" --playground
}

get_buy_quote() {
    local amount=${1:-100000}  # Default 0.001 ckBTC
    print_header "Getting Buy Quote for $amount satoshis"
    
    dfx canister call $BONDING_CURVE_CANISTER get_buy_quote "($amount)" --playground
}

buy_tokens() {
    local amount=${1:-100000}  # Default 0.001 ckBTC
    print_header "Buying Tokens with $amount satoshis"
    
    echo "Getting quote first..."
    get_buy_quote $amount
    
    echo ""
    read -p "Continue with purchase? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Executing buy..."
        dfx canister call $BONDING_CURVE_CANISTER buy "($amount)" --playground
        print_success "Buy transaction complete"
    else
        echo "Purchase cancelled"
    fi
}

get_sell_quote() {
    local amount=${1:-50000}
    print_header "Getting Sell Quote for $amount tokens"
    
    dfx canister call $BONDING_CURVE_CANISTER get_sell_quote "($amount)" --playground
}

sell_tokens() {
    local amount=${1:-50000}
    print_header "Selling $amount tokens"
    
    echo "Getting quote first..."
    get_sell_quote $amount
    
    echo ""
    read -p "Continue with sale? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Executing sell..."
        dfx canister call $BONDING_CURVE_CANISTER sell "($amount)" --playground
        print_success "Sell transaction complete"
    else
        echo "Sale cancelled"
    fi
}

check_stats() {
    print_header "Bonding Curve Statistics"
    
    echo "Current Price:"
    dfx canister call $BONDING_CURVE_CANISTER get_current_price "()" --playground
    
    echo ""
    echo "Curve Stats:"
    dfx canister call $BONDING_CURVE_CANISTER get_curve_stats "()" --playground
    
    echo ""
    echo "Your Token Balance:"
    local principal=$(get_principal)
    dfx canister call $BONDING_CURVE_CANISTER get_user_balance "(principal \"$principal\")" --playground
}

get_test_tokens() {
    print_header "Getting Test ckBTC Tokens"
    
    print_warning "The playground ckBTC canister may not have a faucet."
    echo ""
    echo "Options to get test ckBTC:"
    echo ""
    echo "1. Create a test token instead:"
    echo "   Deploy your own ICRC2 token with initial supply"
    echo ""
    echo "2. Use a different network:"
    echo "   Deploy to local network with test tokens"
    echo ""
    echo "3. Create a mock ckBTC canister for testing:"
    cat << 'EOF'
   
   // Save this as test_token.mo and deploy it
   import ICRC "./icrc";
   
   actor TestCkBTC {
     private var balances = TrieMap.TrieMap<Principal, Nat>(Principal.equal, Principal.hash);
     
     public shared({caller}) func faucet() : async () {
       let current = Option.get(balances.get(caller), 0);
       balances.put(caller, current + 100000000); // Give 1 ckBTC
     };
     
     // Include all ICRC1/ICRC2 functions...
   }
EOF
    echo ""
    echo "4. For playground testing, try these alternative ckBTC canisters:"
    echo "   - rdmx6-jaaaa-aaaah-qcaiq-cai (playground ckBTC)"
    echo "   - br5f7-7uaaa-aaaah-qacow-cai (alternative playground)"
    echo ""
    echo "Would you like to try checking alternative ckBTC canisters? (y/N)"
    read -r response
    if [[ $response =~ ^[Yy]$ ]]; then
        check_alternative_canisters
    fi
}

check_alternative_canisters() {
    local canisters=("rdmx6-jaaaa-aaaah-qcaiq-cai" "br5f7-7uaaa-aaaah-qacow-cai" "xkbuk-fqaaa-aaaah-qcaow-cai")
    local principal=$(get_principal)
    
    for canister in "${canisters[@]}"; do
        echo ""
        echo "Checking canister: $canister"
        
        # Try to get balance
        balance=$(dfx canister call $canister icrc1_balance_of "(
            record {
                owner = principal \"$principal\";
                subaccount = null;
            }
        )" --playground 2>/dev/null | grep -o '[0-9]*' || echo "failed")
        
        if [ "$balance" != "failed" ] && [ "$balance" -gt 0 ]; then
            print_success "Found balance: $balance satoshis in $canister"
            echo "Would you like to use this as your ckBTC canister? (y/N)"
            read -r use_response
            if [[ $use_response =~ ^[Yy]$ ]]; then
                CKBTC_CANISTER=$canister
                echo "CKBTC_CANISTER=\"$CKBTC_CANISTER\"" >> .bonding_env
                print_success "Updated ckBTC canister to $canister"
                return 0
            fi
        else
            echo "No balance or canister not accessible"
        fi
    done
}

run_full_test() {
    print_header "Running Full Test Sequence"
    
    echo "Step 1: Check balances..."
    check_ckbtc_balance
    
    echo ""
    echo "Step 2: Approve spending..."
    approve_spending 1000000  # Approve 0.01 ckBTC
    
    echo ""
    echo "Step 3: Check allowance..."
    check_allowance
    
    echo ""
    echo "Step 4: Get buy quote..."
    get_buy_quote 100000  # Quote for 0.001 ckBTC
    
    echo ""
    echo "Step 5: Buy tokens..."
    buy_tokens 100000
    
    echo ""
    echo "Step 6: Check stats after buy..."
    check_stats
    
    echo ""
    echo "Step 7: Get sell quote..."
    get_sell_quote 50000
    
    echo ""
    echo "Step 8: Check recent trades..."
    check_recent_trades
    
    print_success "Test sequence complete!"
}

show_help() {
    echo "Bonding Curve Interaction Script"
    echo ""
    echo "Usage: ./bonding.sh [command] [amount]"
    echo ""
    echo "Commands:"
    echo "  deploy              Deploy the bonding curve contract"
    echo "  approve [amount]    Approve ckBTC spending (default: 1000000 sats)"
    echo "  allowance           Check current allowance"
    echo "  balance             Check your ckBTC balance"
    echo "  quote-buy [amount]  Get buy quote (default: 100000 sats)"
    echo "  quote-sell [amount] Get sell quote (default: 50000 tokens)"
    echo "  buy [amount]        Buy tokens (default: 100000 sats)"
    echo "  sell [amount]       Sell tokens (default: 50000 tokens)"
    echo "  stats               Show curve statistics"
    echo "  trades              Show recent trades"
    echo "  test                Run full test sequence"
    echo "  get-test-tokens     Get information about getting test ckBTC"
    echo "  create-test-token   Create a test token for development"
    echo "  check-alternatives  Check alternative ckBTC canisters"
    echo "  help                Show this help"
    echo ""
    echo "Examples:"
    echo "  ./bonding.sh deploy"
    echo "  ./bonding.sh approve 500000    # Approve 0.005 ckBTC"
    echo "  ./bonding.sh buy 100000        # Buy with 0.001 ckBTC"
    echo "  ./bonding.sh sell 25000        # Sell 25000 tokens"
    echo ""
    echo "ckBTC Units:"
    echo "  1 ckBTC = 100,000,000 satoshis"
    echo "  0.01 ckBTC = 1,000,000 satoshis"
    echo "  0.001 ckBTC = 100,000 satoshis"
    echo "  0.0001 ckBTC = 10,000 satoshis"
}

# Main command handler
case "${1:-help}" in
    "deploy")
        deploy_bonding_curve
        ;;
    "approve")
        load_canister_id
        approve_spending $2
        ;;
    "allowance")
        load_canister_id
        check_allowance
        ;;
    "balance")
        check_ckbtc_balance
        ;;
    "quote-buy")
        load_canister_id
        get_buy_quote $2
        ;;
    "quote-sell")
        load_canister_id
        get_sell_quote $2
        ;;
    "buy")
        load_canister_id
        buy_tokens $2
        ;;
    "sell")
        load_canister_id
        sell_tokens $2
        ;;
    "stats")
        load_canister_id
        check_stats
        ;;
    "trades")
        load_canister_id
        check_recent_trades
        ;;
    "test")
        load_canister_id
        run_full_test
        ;;
    "get-test-tokens")
        get_test_tokens
        ;;
    "create-test-token")
        create_test_token
        ;;
    "check-alternatives")
        check_alternative_canisters
        ;;
    "help"|*)
        show_help
        ;;
esac