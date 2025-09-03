import { Actor, HttpAgent } from '@dfinity/agent';
import { readFileSync } from 'fs';
import path from 'path';
import fetch from 'node-fetch';

// Polyfill for global fetch
global.fetch = fetch;

// --- CONFIGURATION ---
// The canister ID of your TokenFactory canister.up
const canisterId = '6mce5-laaaa-aaaab-qacsq-cai'; 

// The local path to your Wasm file.
const wasmFilePath = '/workspaces/AstroApeDapp_ICP/src/AstroApe_backend/src/TokenFactory/icrc1_ledger.wasm.gz';
// The URL for the local replica.
const localUrl = 'https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io';
// --------------------

// Complete Candid interface for the TokenFactory canister based on your Motoko code
const idlFactory = ({ IDL }) => {
  // Define Result type
  const Result = IDL.Variant({ 'ok': IDL.Text, 'err': IDL.Text });
  const ResultPrincipal = IDL.Variant({ 'ok': IDL.Principal, 'err': IDL.Text });
  
  // Define Account type
  const Account = IDL.Record({
    'owner': IDL.Principal,
    'subaccount': IDL.Opt(IDL.Vec(IDL.Nat8))
  });

  // Define LogoData type
  const LogoData = IDL.Variant({
    'ImageUrl': IDL.Text,
    'ImageBlob': IDL.Vec(IDL.Nat8)
  });

  // Define TokenMetadata type
  const TokenMetadata = IDL.Record({
    'name': IDL.Text,
    'symbol': IDL.Text,
    'decimals': IDL.Nat8,
    'fee': IDL.Nat,
    'logo': LogoData,
    'description': IDL.Text,
    'website': IDL.Opt(IDL.Text),
    'telegram': IDL.Opt(IDL.Text),
    'twitter': IDL.Opt(IDL.Text),
    'created_at': IDL.Int,
    'total_supply': IDL.Nat,
    'minting_account': Account
  });

  // Define Stats type
  const Stats = IDL.Record({
    'totalTokens': IDL.Nat,
    'totalCreatedCanisters': IDL.Nat,
    'wasmAvailable': IDL.Bool,
    'wasmSize': IDL.Opt(IDL.Nat),
    'fixedSupply': IDL.Nat,
    'defaultDecimals': IDL.Nat8,
    'defaultFee': IDL.Nat
  });

  return IDL.Service({
    // WASM management functions
    'uploadWasm': IDL.Func([IDL.Vec(IDL.Nat8)], [Result], []),
    'save_wasm': IDL.Func([], [Result], []),
    'checkAndSaveWasm': IDL.Func([], [Result], []),
    'isWasmAvailable': IDL.Func([], [IDL.Bool], ['query']),
    'getWasmSize': IDL.Func([], [IDL.Opt(IDL.Nat)], ['query']),

    // Token creation functions
    'createIcrc2Token': IDL.Func([
      IDL.Text, // name
      IDL.Text, // symbol
      LogoData, // logo
      IDL.Text, // description
      IDL.Opt(IDL.Text), // website
      IDL.Opt(IDL.Text), // telegram
      IDL.Opt(IDL.Text)  // twitter
    ], [ResultPrincipal], []),
    'createToken': IDL.Func([IDL.Text, IDL.Text, IDL.Text], [ResultPrincipal], []),

    // Query functions
    'listTokens': IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'listAllCreatedCanisters': IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'getTokenMetadata': IDL.Func([IDL.Principal], [IDL.Opt(TokenMetadata)], ['query']),
    'getAllTokensMetadata': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, TokenMetadata))], ['query']),
    'getFixedSupply': IDL.Func([], [IDL.Nat], ['query']),
    'getDefaultDecimals': IDL.Func([], [IDL.Nat8], ['query']),
    'getDefaultFee': IDL.Func([], [IDL.Nat], ['query']),
    'getStats': IDL.Func([], [Stats], ['query']),
  });
};

const agent = new HttpAgent({ host: localUrl });

// In a local development environment, we need to fetch the root key.
// In a production environment, this is not necessary.
agent.fetchRootKey().catch(err => {
  console.warn("Unable to fetch root key. Check to ensure that your local replica is running");
  console.error(err);
});

const tokenFactory = Actor.createActor(idlFactory, {
  agent,
  canisterId,
});

const uploadWasm = async () => {
  try {
    console.log(`Reading Wasm file from: ${wasmFilePath}`);
    
    // Check if file exists
    if (!readFileSync || !path.resolve(wasmFilePath)) {
      throw new Error(`File not found: ${wasmFilePath}`);
    }
    
    // Read the file from your local filesystem.
    const wasmBuffer = readFileSync(path.resolve(wasmFilePath));
    
    // The buffer needs to be converted to a Uint8Array, which is then
    // automatically converted to a Candid blob (Vec(Nat8)).
    const wasmBlob = new Uint8Array(wasmBuffer);

    console.log(`Uploading Wasm blob (${wasmBlob.length} bytes) to canister ${canisterId}...`);

    // Call the 'uploadWasm' function on the canister.
    const result = await tokenFactory.uploadWasm(wasmBlob);

    // Handle both possible Result variant formats
    if (result && typeof result === 'object') {
      if ('ok' in result) {
        console.log('✅ Success:', result.ok);
      } else if ('err' in result) {
        console.error('❌ Error:', result.err);
      } else if ('Ok' in result) {
        console.log('✅ Success:', result.Ok);
      } else if ('Err' in result) {
        console.error('❌ Error:', result.Err);
      } else {
        console.error('❌ Unexpected response format:', result);
      }
    } else {
      console.error('❌ Invalid response:', result);
    }

  } catch (error) {
    console.error("Failed to upload Wasm:", error);
    
    // Additional debugging information
    if (error.message && error.message.includes('Cannot find field hash')) {
      console.error("\n🔍 Debug Info:");
      console.error("This error typically means the Candid interface doesn't match the deployed canister.");
      console.error("Possible solutions:");
      console.error("1. Regenerate the Candid interface from your deployed canister");
      console.error("2. Check if the canister is properly deployed");
      console.error("3. Verify the canister ID is correct");
    }
  }
};

// Additional helper function to test connection
const testConnection = async () => {
  try {
    console.log("Testing connection to canister...");
    const isWasmAvailable = await tokenFactory.isWasmAvailable();
    console.log("✅ Connection successful. WASM available:", isWasmAvailable);
    
    const stats = await tokenFactory.getStats();
    console.log("📊 Canister stats:", stats);
    
    return true;
  } catch (error) {
    console.error("❌ Connection test failed:", error);
    return false;
  }
};

// Main execution
const main = async () => {
  console.log("🚀 Starting WASM upload process...");
  
  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    console.error("❌ Cannot connect to canister. Aborting upload.");
    return;
  }
  
  // Proceed with upload
  await uploadWasm();
};

main();