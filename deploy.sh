#!/bin/bash

# Create canisters
dfx canister create AstroApe_backend
dfx canister create AstroApe_frontend
dfx canister create ic_siwe_provider
dfx canister create UserStorage

# Fetch canister IDs
IC_SIWE_PROVIDER_ID=$(dfx canister id ic_siwe_provider)
ASTROAPE_BACKEND_ID=$(dfx canister id AstroApe_backend)
USER_STORAGE_ID=$(dfx canister id UserStorage)

# Deploy ic_siwe_provider with arguments
dfx deploy ic_siwe_provider --argument "(
    record {
        domain = \"localhost\";
        uri = \"http://localhost:5173\";
        salt = \"nysecretsalt123\";
        chain_id = 1;
        scheme = \"http\";
        statement = \"Login to the app\";
        sign_in_expires_in = 300000000000;
        session_expires_in = 604800000000000;
        targets = opt vec {
            \"$IC_SIWE_PROVIDER_ID\";
            \"$ASTROAPE_BACKEND_ID\";
            \"$USER_STORAGE_ID\"
        };
    }
)"

# Deploy remaining canisters
dfx deploy AstroApe_backend
dfx deploy AstroApe_frontend
dfx deploy UserStorage

# Generate type bindings
dfx generate
