#!/bin/bash

NETWORK="--network ic"

# Create canisters
dfx canister $NETWORK create AstroApe_frontend
dfx canister $NETWORK create ic_siwe_provider
dfx canister $NETWORK create Comments
dfx canister $NETWORK create TokenFactory
dfx canister $NETWORK create Profile
dfx canister $NETWORK create Referral


# Fetch canister IDs
IC_SIWE_PROVIDER_ID=$(dfx canister $NETWORK id ic_siwe_provider)
COMMENTS_ID=$(dfx canister $NETWORK id Comments)
PROFILE_ID=$(dfx canister $NETWORK id Profile) 
REFERRAL_ID=$(dfx canister $NETWORK id Referral)
TOKEN_FACTORY_ID=$(dfx canister $NETWORK id TokenFactory)
ASTROAPE_FRONTEND_ID=$(dfx canister $NETWORK id AstroApe_frontend)

# Deploy ic_siwe_provider with arguments
dfx deploy ic_siwe_provider $NETWORK --argument "(
    record {
        domain = \"lxxcl-eyaaa-aaaap-qhsgq-cai.icp0.io\";
        uri = \"https://lxxcl-eyaaa-aaaap-qhsgq-cai.icp0.io\";
        salt = \"nysecretsalt123\";
        chain_id = opt 1;
        scheme = opt \"https\";
        statement = opt \"Login to the app\";
        sign_in_expires_in = opt 300000000000;
        session_expires_in = opt 604800000000000;
        targets = opt vec {
            \"$IC_SIWE_PROVIDER_ID\";
            \"$COMMENTS_ID\";
            \"$TOKEN_FACTORY_ID\"
        };
    }
)"

# Deploy remaining canisters
dfx deploy AstroApe_frontend $NETWORK
dfx deploy Comments $NETWORK
dfx deploy TokenFactory $NETWORK
dfx deploy Profile $NETWORK
dfx deploy Referral $NETWORK



# Generate type bindings
dfx generate $NETWORK
