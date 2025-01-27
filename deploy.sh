#!/bin/bash

# Create canisters
dfx canister create AstroApe_backend
dfx canister create AstroApe_frontend
dfx canister create ic_siwe_provider

# Deploy ic_siwe_provider with arguments
dfx deploy ic_siwe_provider --argument '(
    record{
        domain = "localhost";
        uri = "http://localhost:5173";
        salt = "nysecretsalt123";
        chain_id = 1;
        scheme = "http";
        statement = "Login to the app";
        sign_in_expires_in = 300000000000;
        session_expires_in = 604800000000000;
        targets = opt vec {
            "'$(dfx canister id ic_siwe_provider)'";
            "'$(dfx canister id AstroApe_backend)'"
        };
    }
)'

# Deploy remaining canisters
dfx deploy AstroApe_backend
dfx deploy AstroApe_frontend

# Generate type bindings
dfx generate
