#!/bin/bash
export PATH=$(npm bin):$PATH

NETWORK="local"

# Wait for dfx replica to be ready
echo "Waiting for dfx replica to start..."
until dfx ping "$NETWORK"; do
  sleep 1
done
echo "dfx replica is ready."

# Explicitly create all canisters
dfx canister create internet_identity --network $NETWORK
dfx canister create BondingCurve --network $NETWORK
dfx canister create TokenFactory --network $NETWORK
dfx canister create Comments --network $NETWORK
dfx canister create Profile --network $NETWORK
dfx canister create Profile2 --network $NETWORK
dfx canister create Referral --network $NETWORK
dfx canister create Vault --network $NETWORK
dfx canister create Faucet --network $NETWORK
dfx canister create ic_siwe_provider --network $NETWORK
dfx canister create AstroApe_frontend --network $NETWORK

# Fetch canister IDs
IC_SIWE_PROVIDER_ID=$(dfx canister id ic_siwe_provider --network $NETWORK)
COMMENTS_ID=$(dfx canister id Comments)
TOKENFACTORY=$(dfx canister id TokenFactory --network $NETWORK)
ASTROAPE_FRONTEND_ID=$(dfx canister id AstroApe_frontend --network $NETWORK)
PROFILE_ID=$(dfx canister id Profile --network $NETWORK)


# Generate type bindings BEFORE deploying and building frontend
dfx generate --network $NETWORK
dfx generate Comments # This is redundant if dfx generate --network $NETWORK does all, but keeping for now


# Deploy ic_siwe_provider with arguments
dfx deploy ic_siwe_provider --network $NETWORK --argument "(
    record {
        domain = \"localhost\";
        uri = \"http://fantastic-invention-7vr47rgx6r79fxvj9-5173.app.github.dev\";
        salt = \"nysecretsalt123\";
        chain_id = opt 1;
        scheme = opt \"http\";
        statement = opt \"Login to the app\";
        sign_in_expires_in = opt 300000000000;
        session_expires_in = opt 604800000000000;
        targets = opt vec {
            \"$IC_SIWE_PROVIDER_ID\";
            \"$COMMENTS_ID\";
            \"$PROFILE_ID\";
            \"$TOKENFACTORY\";
        };
    }
)"

# Deploy ckbtc_ledger with arguments (Force reinstall to set initial balances)
dfx canister stop ckbtc_ledger || true
dfx canister delete ckbtc_ledger || true
export MINTER=$(dfx identity get-principal)
dfx deploy ckbtc_ledger --network $NETWORK --mode reinstall --yes --argument "(variant {Init = record {
  token_symbol = \"ckBTC\";
  token_name = \"Chain Key Bitcoin\";
  minting_account = record { owner = principal \"$MINTER\" };
  transfer_fee = 10;
  metadata = vec {};
  feature_flags = opt record{ icrc2 = true };
  initial_balances = vec { record { record { owner = principal \"$MINTER\"; }; 100000000000; } };
  archive_options = record {
    num_blocks_to_archive = 1000;
    trigger_threshold = 2000;
    controller_id = principal \"$MINTER\";
    cycles_for_archive_creation = opt 10000000000000;
  };
}})"

# Deploy remaining canisters
dfx deploy AstroApe_frontend --network $NETWORK
dfx deploy Comments 
dfx deploy TokenFactory --network $NETWORK
dfx ledger fabricate-cycles --canister TokenFactory --cycles 10000000000000 --network $NETWORK || echo "Fabricate cycles failed, trying standard topup"
dfx deploy Profile --network $NETWORK
# Deploy BondingCurve with dummy init params (as template/default)
dfx deploy BondingCurve --network $NETWORK

node uploadWasm.mjs

# Run User Simulation and Setup
chmod +x simulate_users.sh
./simulate_users.sh

