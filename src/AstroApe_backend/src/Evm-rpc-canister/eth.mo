import EvmRpc "canister:evm_rpc";
import IC "ic:aaaaa-aa";
import Blob "mo:base/Blob";
import Debug "mo:base/Debug";
import Cycles "mo:base/ExperimentalCycles";
import Text "mo:base/Text";
import Base16 "mo:base16/Base16";
import Sha256 "mo:sha2/Sha256";

// EVM Types (you may need to adjust based on your EvmRpc canister interface)
type Address = Blob;
type Uint256 = Blob;

persistent actor EvmUniswapPool {
  let key_name = "test_key_1"; // Replace for production
  let uniswapFactory : Text = "0x1F98431c8aD98523631AE4a59f267346ea31F984"; // Uniswap V3 factory

  /// Converts a hex string to Blob
  func hexToBlob(hex : Text) : Blob {
    Base16.decode(Text.stripStart(hex, #text "0x"));
  };

  /// Builds calldata for UniswapV3Factory.createPool(address,address,uint24)
  func encodeCreatePool(tokenA : Address, tokenB : Address, fee : Nat) : Blob {
    let selector = hexToBlob("0xc9c65396"); // createPool(address,address,uint24)
    let padding = func(x : Nat) : Blob {
      let bytes = Blob.fromArray([x >> 24, (x >> 16) & 0xFF, (x >> 8) & 0xFF, x & 0xFF]);
      Blob.fromArray([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] # Blob.toArray(bytes));
    };

    selector # tokenA # tokenB # padding(fee);
  };

  public func createPoolEvm(
    tokenA : Text,
    tokenB : Text,
    fee : Nat
  ) : async Text {
    let to = hexToBlob(uniswapFactory);
    let data = encodeCreatePool(hexToBlob(tokenA), hexToBlob(tokenB), fee);

    // Step 1: Get public key
    let pubkeyResp = await IC.ecdsa_public_key({
      canister_id = null;
      derivation_path = [];
      key_id = { curve = #secp256k1; name = key_name };
    });
    let pubkey = pubkeyResp.public_key;

    // Step 2: Derive Ethereum address from pubkey
    let pubkeyHash = Sha256.fromBlob(Blob.drop(pubkey, 1)); // remove 0x04 prefix
    let ethAddress = Blob.fromArray(Blob.toArray(pubkeyHash)[24:]); // last 20 bytes

    // Step 3: Get nonce
    let rpcServices : EvmRpc.RpcServices = #EthMainnet(?[#Llama]);
    Cycles.add<system>(10_000_000_000);

    let nonceRes = await EvmRpc.eth_getTransactionCount(rpcServices, ethAddress, #Latest);
    let nonce = switch nonceRes {
      case (#Ok(n)) n;
      case (#Err(e)) Debug.trap("Nonce fetch failed: " # debug_show e);
    };

    // Step 4: Build unsigned tx
    let tx : EvmRpc.Transaction = {
      from = ethAddress;
      to = ?to;
      value = null;
      gas = ?210_000;
      gas_price = ?100_000_000_000;
      nonce = ?nonce;
      data = ?data;
      chain_id = ?1;
    };

    // Step 5: Sign tx
    let signed = await EvmRpc.sign_transaction({
      key_name = key_name;
      transaction = tx;
    });

    // Step 6: Send raw transaction
    let sent = await EvmRpc.eth_sendRawTransaction(rpcServices, signed.raw_transaction);
    switch sent {
      case (#Ok(txHash)) {
        "Tx sent: 0x" # Base16.encode(txHash);
      };
      case (#Err(e)) {
        Debug.trap("Send failed: " # debug_show e);
      };
    };
  };
};
