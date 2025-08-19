#!/bin/bash

# Create canisters
dfx canister create AstroApe_frontend
dfx canister create ic_siwe_provider
dfx canister create Comments
dfx canister create TokenFactory
dfx canister create Profile
dfx canister create ApeSwap





# Fetch canister IDs
IC_SIWE_PROVIDER_ID=$(dfx canister id ic_siwe_provider)
COMMENTS_ID=$(dfx canister id Comments)
TOKENFACTORY=$(dfx canister id TokenFactory)
ASTROAPE_FRONTEND_ID=$(dfx canister id AstroApe_frontend)
PROFILE_ID=$(dfx canister id Profile)
APESWAP_ID=$(dfx canister id ApeSwap)





# Deploy ic_siwe_provider with arguments
dfx deploy ic_siwe_provider --argument "(
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
            \"$APESWAP_ID\";
            \"$TOKENFACTORY\";
          
        };
    }
)"

# Deploy remaining canisters
dfx deploy AstroApe_frontend
dfx deploy Comments
dfx deploy TokenFactory 
dfx deploy Profile
dfx deploy ApeSwap



# Generate type bindings
dfx generate

node uploadWasm.mjs