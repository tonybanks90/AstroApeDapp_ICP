import { Actor, HttpAgent } from '@dfinity/agent';
import { readFileSync } from 'fs';
import path from 'path';
import fetch from 'node-fetch';

// Polyfill for global fetch
global.fetch = fetch;

// --- CONFIGURATION ---
// The canister ID of your TokenFactory canister.
const canisterId = 'umunu-kh777-77774-qaaca-cai'; 

// The local path to your Wasm file.
const wasmFilePath = '/workspaces/AstroApeDapp_ICP/src/AstroApe_backend/src/TokenFactory/icrc1_ledger.wasm.gz';
// The URL for the local replica.
const localUrl = 'http://127.0.0.1:4943';
// --------------------

// The Candid interface for the TokenFactory canister.
// This tells the script what functions are available and what arguments they expect.
const idlFactory = ({ IDL }) => {
  const Result = IDL.Variant({ Ok: IDL.Text, Err: IDL.Text });
  return IDL.Service({
    'uploadWasm': IDL.Func([IDL.Vec(IDL.Nat8)], [Result], []),
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
    // Read the file from your local filesystem.
    const wasmBuffer = readFileSync(path.resolve(wasmFilePath));
    
    // The buffer needs to be converted to a Uint8Array, which is then
    // automatically converted to a Candid blob (Vec(Nat8)).
    const wasmBlob = new Uint8Array(wasmBuffer);

    console.log(`Uploading Wasm blob (${wasmBlob.length} bytes) to canister ${canisterId}...`);

    // Call the 'uploadWasm' function on the canister.
    const result = await tokenFactory.uploadWasm(wasmBlob);

    if ('Ok' in result) {
        console.log('✅ Success:', result.Ok);
    } else if ('Err' in result) {
        console.error('❌ Error:', result.Err);
    } else {
        console.error('❌ Unexpected response:', result);
    }

  } catch (error) {
    console.error("Failed to upload Wasm:", error);
  }
};

uploadWasm();
