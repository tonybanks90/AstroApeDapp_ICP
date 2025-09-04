import { Actor, HttpAgent } from '@dfinity/agent';
import { readFileSync } from 'fs';
import path from 'path';
import fetch from 'node-fetch';

// Polyfill for global fetch
global.fetch = fetch;

// --- CONFIGURATION ---
// The canister ID of your TokenFactory canister
const canisterId = '6fbpb-5iaaa-aaaab-qacta-cai'; 

// The local path to your Wasm file
const wasmFilePath = '/workspaces/AstroApeDapp_ICP/wasm/icrc1_ledger.wasm.gz';
// The URL for the local replica or mainnet
const localUrl = 'https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io';
// --------------------

// Updated Candid interface for the Enhanced TokenFactory with Bitcoin/Ethereum support
const idlFactory = ({ IDL }) => {
  // Define Result types
  const Result = IDL.Variant({ 'ok': IDL.Text, 'err': IDL.Text });
  const ResultPrincipal = IDL.Variant({ 'ok': IDL.Principal, 'err': IDL.Text });
  const ResultNat = IDL.Variant({ 'ok': IDL.Nat, 'err': IDL.Text });
  
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

  // Define ChainType
  const ChainType = IDL.Variant({
    'Bitcoin': IDL.Null,
    'Ethereum': IDL.Null
  });

  // Define TokenMetadata type (updated with chain_type)
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
    'chain_type': ChainType,
    'minting_account': Account
  });

  // Define Enhanced Stats type
  const Stats = IDL.Record({
    'totalTokens': IDL.Nat,
    'bitcoinTokens': IDL.Nat,
    'ethereumTokens': IDL.Nat,
    'totalCreatedCanisters': IDL.Nat,
    'wasmAvailable': IDL.Bool,
    'wasmSize': IDL.Opt(IDL.Nat),
    'bitcoinSupply': IDL.Nat,
    'ethereumSupply': IDL.Nat,
    'defaultDecimals': IDL.Nat8,
    'defaultFee': IDL.Nat
  });

  // Define Detailed Stats type
  const DetailedStats = IDL.Record({
    'totalTokens': IDL.Nat,
    'bitcoinTokens': IDL.Nat,
    'ethereumTokens': IDL.Nat,
    'totalCreatedCanisters': IDL.Nat,
    'wasmAvailable': IDL.Bool,
    'wasmSize': IDL.Opt(IDL.Nat),
    'tokensWithWebsite': IDL.Nat,
    'tokensWithTelegram': IDL.Nat,
    'tokensWithTwitter': IDL.Nat,
    'tokensWithAllSocials': IDL.Nat,
    'averageSupply': IDL.Opt(IDL.Nat),
    'totalSupplyAllTokens': IDL.Nat,
    'uniqueDecimals': IDL.Vec(IDL.Nat8),
    'uniqueFees': IDL.Vec(IDL.Nat),
    'oldestToken': IDL.Opt(IDL.Tuple(IDL.Principal, IDL.Int)),
    'newestToken': IDL.Opt(IDL.Tuple(IDL.Principal, IDL.Int))
  });

  // Define Pagination Result type
  const PaginationResult = IDL.Record({
    'tokens': IDL.Vec(IDL.Tuple(IDL.Principal, TokenMetadata)),
    'totalPages': IDL.Nat,
    'currentPage': IDL.Nat,
    'totalTokens': IDL.Nat
  });

  // Define Chain Count type
  const ChainCount = IDL.Record({
    'bitcoin': IDL.Nat,
    'ethereum': IDL.Nat
  });

  return IDL.Service({
    // WASM management functions
    'uploadWasm': IDL.Func([IDL.Vec(IDL.Nat8)], [Result], []),
    'save_wasm': IDL.Func([], [Result], []),
    'checkAndSaveWasm': IDL.Func([], [Result], []),
    'isWasmAvailable': IDL.Func([], [IDL.Bool], ['query']),
    'getWasmSize': IDL.Func([], [IDL.Opt(IDL.Nat)], ['query']),

    // Enhanced token creation functions
    'createTokenWithChain': IDL.Func([
      IDL.Text, // name
      IDL.Text, // symbol
      LogoData, // logo
      IDL.Text, // description
      IDL.Opt(IDL.Text), // website
      IDL.Opt(IDL.Text), // telegram
      IDL.Opt(IDL.Text), // twitter
      ChainType // chainType
    ], [ResultPrincipal], []),
    'createBitcoinToken': IDL.Func([
      IDL.Text, // name
      IDL.Text, // symbol
      LogoData, // logo
      IDL.Text, // description
      IDL.Opt(IDL.Text), // website
      IDL.Opt(IDL.Text), // telegram
      IDL.Opt(IDL.Text)  // twitter
    ], [ResultPrincipal], []),
    'createEthereumToken': IDL.Func([
      IDL.Text, // name
      IDL.Text, // symbol
      LogoData, // logo
      IDL.Text, // description
      IDL.Opt(IDL.Text), // website
      IDL.Opt(IDL.Text), // telegram
      IDL.Opt(IDL.Text)  // twitter
    ], [ResultPrincipal], []),
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

    // Balance checking functions
    'getFactoryTokenBalance': IDL.Func([IDL.Principal], [ResultNat], []),
    'getAllFactoryBalances': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, ResultNat))], []),

    // Basic query functions
    'listTokens': IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'listAllCreatedCanisters': IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'getTokenMetadata': IDL.Func([IDL.Principal], [IDL.Opt(TokenMetadata)], ['query']),
    'getAllTokensMetadata': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, TokenMetadata))], ['query']),

    // Chain type filtering
    'getTokensByChainType': IDL.Func([ChainType], [IDL.Vec(IDL.Tuple(IDL.Principal, TokenMetadata))], ['query']),
    'getBitcoinTokens': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, TokenMetadata))], ['query']),
    'getEthereumTokens': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, TokenMetadata))], ['query']),

    // Search functions
    'findTokenBySymbol': IDL.Func([IDL.Text], [IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Principal, TokenMetadata)))], ['query']),
    'findTokenByName': IDL.Func([IDL.Text], [IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Principal, TokenMetadata)))], ['query']),
    'searchTokens': IDL.Func([IDL.Text], [IDL.Vec(IDL.Tuple(IDL.Principal, TokenMetadata))], ['query']),

    // Time-based queries
    'getTokensCreatedAfter': IDL.Func([IDL.Int], [IDL.Vec(IDL.Tuple(IDL.Principal, TokenMetadata))], ['query']),
    'getTokensCreatedBefore': IDL.Func([IDL.Int], [IDL.Vec(IDL.Tuple(IDL.Principal, TokenMetadata))], ['query']),
    'getRecentTokens': IDL.Func([IDL.Nat], [IDL.Vec(IDL.Tuple(IDL.Principal, TokenMetadata))], ['query']),
    'getOldestTokens': IDL.Func([IDL.Nat], [IDL.Vec(IDL.Tuple(IDL.Principal, TokenMetadata))], ['query']),

    // Supply-based queries
    'getTokensBySupplyRange': IDL.Func([IDL.Nat, IDL.Nat], [IDL.Vec(IDL.Tuple(IDL.Principal, TokenMetadata))], ['query']),
    'getHighSupplyTokens': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, TokenMetadata))], ['query']),
    'getLowSupplyTokens': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, TokenMetadata))], ['query']),

    // Social media queries
    'getTokensWithWebsite': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, TokenMetadata))], ['query']),
    'getTokensWithTelegram': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, TokenMetadata))], ['query']),
    'getTokensWithTwitter': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, TokenMetadata))], ['query']),
    'getTokensWithAllSocials': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, TokenMetadata))], ['query']),

    // Technical queries
    'getTokensByFeeRange': IDL.Func([IDL.Nat, IDL.Nat], [IDL.Vec(IDL.Tuple(IDL.Principal, TokenMetadata))], ['query']),
    'getTokensByDecimals': IDL.Func([IDL.Nat8], [IDL.Vec(IDL.Tuple(IDL.Principal, TokenMetadata))], ['query']),
    'getTokensWithImageUrl': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, TokenMetadata))], ['query']),
    'getTokensWithImageBlob': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, TokenMetadata))], ['query']),

    // Constants
    'getBitcoinSupply': IDL.Func([], [IDL.Nat], ['query']),
    'getEthereumSupply': IDL.Func([], [IDL.Nat], ['query']),
    'getDefaultDecimals': IDL.Func([], [IDL.Nat8], ['query']),
    'getDefaultFee': IDL.Func([], [IDL.Nat], ['query']),
    'getChainTypeSupply': IDL.Func([ChainType], [IDL.Nat], ['query']),

    // Statistics
    'getStats': IDL.Func([], [Stats], ['query']),
    'getDetailedStats': IDL.Func([], [DetailedStats], ['query']),
    'getTokenCountByChainType': IDL.Func([], [ChainCount], ['query']),

    // Utility functions
    'getTokensPaginated': IDL.Func([IDL.Nat, IDL.Nat], [PaginationResult], ['query']),
    'tokenExists': IDL.Func([IDL.Principal], [IDL.Bool], ['query']),
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

// Enhanced connection test with new features
const testConnection = async () => {
  try {
    console.log("Testing connection to enhanced TokenFactory canister...");
    
    const isWasmAvailable = await tokenFactory.isWasmAvailable();
    console.log("✅ Connection successful. WASM available:", isWasmAvailable);
    
    const stats = await tokenFactory.getStats();
    console.log("📊 Enhanced Canister Stats:");
    console.log("  - Total Tokens:", stats.totalTokens.toString());
    console.log("  - Bitcoin Tokens:", stats.bitcoinTokens.toString());
    console.log("  - Ethereum Tokens:", stats.ethereumTokens.toString());
    console.log("  - Total Canisters:", stats.totalCreatedCanisters.toString());
    console.log("  - Bitcoin Supply:", stats.bitcoinSupply.toString());
    console.log("  - Ethereum Supply:", stats.ethereumSupply.toString());
    console.log("  - Default Decimals:", stats.defaultDecimals.toString());
    console.log("  - Default Fee:", stats.defaultFee.toString());
    
    // Test chain type supplies
    const bitcoinSupply = await tokenFactory.getBitcoinSupply();
    const ethereumSupply = await tokenFactory.getEthereumSupply();
    console.log("🔗 Chain Type Supplies:");
    console.log("  - Bitcoin Supply:", bitcoinSupply.toString(), "(21M)");
    console.log("  - Ethereum Supply:", ethereumSupply.toString(), "(1B)");
    
    return true;
  } catch (error) {
    console.error("❌ Connection test failed:", error);
    return false;
  }
};

// Test token creation functions
const testTokenCreation = async () => {
  try {
    console.log("\n🧪 Testing token creation functions...");
    
    // Test creating a Bitcoin token
    console.log("Creating a test Bitcoin token...");
    const bitcoinResult = await tokenFactory.createBitcoinToken(
      "Test Bitcoin Token",
      "TBTC",
      { ImageUrl: "https://bitcoin.org/img/icons/opengraph.png" },
      "A test Bitcoin-inspired token with 21M supply",
      ["https://bitcoin.org"],
      ["@testbitcoin"],
      ["@testbitcoin"]
    );
    
    if ('ok' in bitcoinResult) {
      console.log("✅ Bitcoin token created:", bitcoinResult.ok.toString());
      
      // Check TokenFactory balance
      const balance = await tokenFactory.getFactoryTokenBalance(bitcoinResult.ok);
      if ('ok' in balance) {
        console.log("💰 TokenFactory balance:", balance.ok.toString());
      }
    } else {
      console.log("❌ Bitcoin token creation failed:", bitcoinResult.err);
    }
    
  } catch (error) {
    console.log("⚠️ Token creation test failed (this is expected if WASM not uploaded):", error.message);
  }
};

// Main execution with enhanced testing
const main = async () => {
  console.log("🚀 Starting Enhanced TokenFactory WASM upload process...");
  
  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    console.error("❌ Cannot connect to canister. Aborting upload.");
    return;
  }
  
  // Proceed with upload
  await uploadWasm();
  
  // Test token creation after upload (optional)
  console.log("\n🔄 Testing enhanced features after WASM upload...");
  await testConnection(); // Check stats again
  await testTokenCreation(); // Try creating a token
};

main();