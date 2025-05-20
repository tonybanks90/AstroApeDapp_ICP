import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Timer "mo:base/Timer";

actor CkBoostManager {
    public type EthAddress = Text;
    public type TxHash = Text;
    public type BlockNumber = Nat;

    public type UserData = {
        ethAddress : EthAddress;
        ckEthCredited : Bool;
        lastChecked : Time.Time;
    };

    public type DepositData = {
        principal : Principal;
        depositAmount : ?Float;
        depositConfirmed : Bool;
        ckEthMinted : Bool;
        txHash : ?TxHash;
        lastCheckedBlock : BlockNumber;
    };

    private stable var userEntries : [(Principal, UserData)] = [];
    private stable var depositEntries : [(EthAddress, DepositData)] = [];
    private stable var timerId : ?Timer.TimerId = null;

    private var users = HashMap.fromIter<Principal, UserData>(
        userEntries.vals(), 0, Principal.equal, Principal.hash
    );
    private var deposits = HashMap.fromIter<EthAddress, DepositData>(
        depositEntries.vals(), 0, Text.equal, Text.hash
    );

    let ckBoost : actor {
        getEthAddress : shared (Principal) -> async EthAddress;
        checkDepositStatus : shared (EthAddress) -> async {
            #confirmed : {
                amount : Float;
                txHash : TxHash;
                blockNumber : BlockNumber;
            };
            #pending;
            #notFound;
        };
        checkMintingStatus : shared (EthAddress) -> async Bool;
    } = actor("aaaaa-aa"); // Replace with actual canister ID

    public shared(msg) func register(ethAddress : EthAddress) : async Result.Result<EthAddress, Text> {
        let principal = msg.caller;

        if (ethAddress.size() != 42 or not Text.startsWith(ethAddress, #text "0x")) {
            return #err("Invalid ETH address format");
        };

        switch (users.get(principal)) {
            case (?userData) {
                return #ok(userData.ethAddress);
            };
            case null {
                let depositAddress = await ckBoost.getEthAddress(principal);

                let userData : UserData = {
                    ethAddress = depositAddress;
                    ckEthCredited = false;
                    lastChecked = Time.now();
                };
                users.put(principal, userData);

                let depositData : DepositData = {
                    principal = principal;
                    depositAmount = null;
                    depositConfirmed = false;
                    ckEthMinted = false;
                    txHash = null;
                    lastCheckedBlock = 0;
                };
                deposits.put(depositAddress, depositData);

                if (timerId == null) {
                    ignore startPolling();
                };

                return #ok(depositAddress);
            };
        };
    };

    public query func getEthAddress(user : Principal) : async ?EthAddress {
        switch (users.get(user)) {
            case (?userData) { return ?userData.ethAddress };
            case null { return null };
        }
    };

    public query func getCkEthStatus(user : Principal) : async ?Bool {
        switch (users.get(user)) {
            case (?userData) { return ?userData.ckEthCredited };
            case null { return null };
        }
    };

    public query func getDepositStatus(ethAddress : EthAddress) : async ?DepositData {
        return deposits.get(ethAddress);
    };

    private func startPolling() : async () {
        timerId := ?Timer.recurringTimer(
            #seconds 60,
            func() : async () {
                await checkAllDeposits();
            }
        );
    };

    private func stopPolling() {
        switch (timerId) {
            case (?id) {
                Timer.cancelTimer(id);
                timerId := null;
            };
            case null {};
        };
    };

    // ✅ Fixed with recursion for async-safe loop
    private func checkAllDeposits() : async () {
        let depositList = Iter.toArray(deposits.entries());
        await checkDepositsRecursive(depositList, 0);
    };

    private func checkDepositsRecursive(depositList : [(EthAddress, DepositData)], index : Nat) : async () {
        if (index >= depositList.size()) return;

        let (ethAddress, depositData) = depositList[index];
        if (not depositData.ckEthMinted) {
            await checkDeposit(ethAddress, depositData);
        };
        await checkDepositsRecursive(depositList, index + 1);
    };

    private func checkDeposit(ethAddress : EthAddress, depositData : DepositData) : async () {
        let depositStatus = await ckBoost.checkDepositStatus(ethAddress);

        switch (depositStatus) {
            case (#confirmed { amount; txHash; blockNumber }) {
                if (not depositData.depositConfirmed) {
                    deposits.put(ethAddress, {
                        principal = depositData.principal;
                        depositAmount = ?amount;
                        depositConfirmed = true;
                        ckEthMinted = depositData.ckEthMinted;
                        txHash = ?txHash;
                        lastCheckedBlock = blockNumber;
                    });
                };

                let mintingStatus = await ckBoost.checkMintingStatus(ethAddress);
                if (mintingStatus and not depositData.ckEthMinted) {
                    deposits.put(ethAddress, {
                        principal = depositData.principal;
                        depositAmount = depositData.depositAmount;
                        depositConfirmed = true;
                        ckEthMinted = true;
                        txHash = depositData.txHash;
                        lastCheckedBlock = depositData.lastCheckedBlock;
                    });

                    switch (users.get(depositData.principal)) {
                        case (?userData) {
                            users.put(depositData.principal, {
                                ethAddress = userData.ethAddress;
                                ckEthCredited = true;
                                lastChecked = Time.now();
                            });
                        };
                        case null {};
                    };
                };
            };
            case (#pending) {};
            case (#notFound) {};
        };
    };
};
