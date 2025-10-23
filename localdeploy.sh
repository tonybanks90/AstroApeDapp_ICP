#!/bin/bash

NETWORK="ic"

# Create canisters
dfx canister create AstroApe_frontend --network $NETWORK
dfx canister create ic_siwe_provider --network $NETWORK
dfx canister create Comments --network $NETWORK
dfx canister create TokenFactory --network $NETWORK
dfx canister create Profile --network $NETWORK


# Fetch canister IDs
IC_SIWE_PROVIDER_ID=$(dfx canister id ic_siwe_provider --network $NETWORK)
COMMENTS_ID=$(dfx canister id Comments) --network $NETWORK
TOKENFACTORY=$(dfx canister id TokenFactory --network $NETWORK)
ASTROAPE_FRONTEND_ID=$(dfx canister id AstroApe_frontend --network $NETWORK)
PROFILE_ID=$(dfx canister id Profile --network $NETWORK)


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

# Deploy remaining canisters
dfx deploy AstroApe_frontend --network $NETWORK
dfx deploy Comments --network $NETWORK
dfx deploy TokenFactory --network $NETWORK
dfx deploy Profile --network $NETWORK


# Generate type bindings
dfx generate --network $NETWORK
dfx generate Comments --network $NETWORK


node uploadWasm.mjs
