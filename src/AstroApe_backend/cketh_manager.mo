import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Error "mo:base/Error";
import ckethMinter "canister:cketh_minter";
import ckethLedger "canister:cketh_ledger";

actor CkethManager {
    public shared(msg) func convertEthToCketh(amount: Nat) : async Text {
        let caller = msg.caller;
        
        // Check if the minter has received the ETH deposit
        // This step is simplified and would require additional implementation
        // to verify the ETH deposit on the Ethereum network
        let mintResult = await ckethMinter.mint({
            amount = amount;
            recipient = caller;
        });

        switch (mintResult) {
            case (#Ok(blockIndex)) {
                return "Successfully minted " # Nat.toText(amount) # " ckETH. Block index: " # Nat.toText(blockIndex);
            };
            case (#Err(error)) {
                return "Error minting ckETH: " # debug_show(error);
            };
        };
    };

    public shared(msg) func checkCkethBalance() : async Nat {
        let caller = msg.caller;
        let balance = await ckethLedger.icrc1_balance_of({ owner = caller; subaccount = null });
        balance
    };
}