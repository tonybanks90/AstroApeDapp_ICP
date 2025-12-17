#!/bin/bash
set -e

echo "=================================================="
echo "  Deploying IC SIWE Provider"
echo "=================================================="

NETWORK="local"

# 1. Fetch current canister IDs
echo "Fetching Canister IDs..."
IC_SIWE_PROVIDER_ID=$(dfx canister id ic_siwe_provider --network $NETWORK 2>/dev/null || echo "")
COMMENTS_ID=$(dfx canister id Comments --network $NETWORK 2>/dev/null || echo "")
PROFILE_ID=$(dfx canister id Profile --network $NETWORK 2>/dev/null || echo "")
TOKENFACTORY_ID=$(dfx canister id TokenFactory --network $NETWORK 2>/dev/null || echo "")
CKBTC_LEDGER_ID=$(dfx canister id ckbtc_ledger --network $NETWORK 2>/dev/null || echo "")
VAULT_ID=$(dfx canister id Vault --network $NETWORK 2>/dev/null || echo "")
BONDINGCURVE_ID=$(dfx canister id BondingCurve --network $NETWORK 2>/dev/null || echo "")

if [ -z "$IC_SIWE_PROVIDER_ID" ]; then
    echo "Creating ic_siwe_provider canister..."
    dfx canister create ic_siwe_provider --network $NETWORK
    IC_SIWE_PROVIDER_ID=$(dfx canister id ic_siwe_provider --network $NETWORK)
fi

echo "  ic_siwe_provider: $IC_SIWE_PROVIDER_ID"
echo "  Comments:         $COMMENTS_ID"
echo "  Profile:          $PROFILE_ID"
# Check if variables are set
if [ -z "$COMMENTS_ID" ] || [ -z "$PROFILE_ID" ] || [ -z "$TOKENFACTORY_ID" ]; then
    echo "ERROR: One or more target canister IDs are missing."
    exit 1
fi

echo ""
echo "Deploying ic_siwe_provider..."

# Note: The URI here matches the one in localdeploy.sh. 
# If you are running on a different port/Gitpod URL, update this URI!
DOMAIN="localhost"
URI="http://fantastic-invention-7vr47rgx6r79fxvj9-5173.app.github.dev"

# Salt must be at least 32 characters? strict validation in newer versions
SALT="nysecretsalt12345678901234567890"

# Fetch Tokens dynamically
TOKENS=$(dfx canister call TokenFactory listTokens --network $NETWORK 2>/dev/null | grep -oP 'principal "\K[^"]+')

# Construct target list (manually for now as passing arrays in bash is tricky)
# We will just append them to the targets vec

dfx deploy ic_siwe_provider --network $NETWORK --yes --argument "(
    record {
        domain = \"$DOMAIN\";
        uri = \"$URI\";
        salt = \"$SALT\";
        chain_id = opt 1;
        scheme = opt \"http\";
        statement = opt \"Login to the app\";
        sign_in_expires_in = opt 300000000000;
        session_expires_in = opt 604800000000000;
        targets = opt vec {
            \"$IC_SIWE_PROVIDER_ID\";
            \"$COMMENTS_ID\";
            \"$PROFILE_ID\";
            \"$TOKENFACTORY_ID\";
            \"$CKBTC_LEDGER_ID\";
            \"$VAULT_ID\";
            \"$BONDINGCURVE_ID\";
            $(for t in $TOKENS; do echo "\"$t\";"; done)
        };
    }
)"

echo ""
echo "=================================================="
echo "  IC SIWE PROVIDER DEPLOYED"
echo "=================================================="
