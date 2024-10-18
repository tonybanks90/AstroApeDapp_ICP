import ICRC2 from "ic:YOUR_ICRC2_TOKEN_CANISTER_ID";

actor BondingCurve {

    // Define state variables
    var totalSupply : Nat = 0;
    var reserve : Nat = 0;
    let initialPrice : Nat = 1_000_000;  // Initial price in base units (e.g., ICP)
    let slope : Nat = 1_000;             // Slope of the bonding curve

    // Function to calculate price based on total supply
    func calculatePrice(amountToBuy: Nat) : Nat {
        return initialPrice + (slope * totalSupply) + (slope * amountToBuy / 2);
    }

    // Function to buy tokens
    public shared(msg) func buyTokens(amount: Nat) : async Result<Nat, Text> {
        let price = calculatePrice(amount);
        let totalCost = price * amount;

        // Ensure user sent enough ICP or base token
        if (msg.callerBalance < totalCost) {
            return #err("Insufficient funds");
        }

        // Transfer ICP or base token to reserve
        reserve += totalCost;

        // Mint new tokens
        totalSupply += amount;
        let result = await ICRC2.mint(msg.caller, amount);
        
        switch (result) {
            case (#ok _):
                return #ok(amount);
            case (#err error):
                return #err(error);
        };
    }

    // Function to sell tokens
    public shared(msg) func sellTokens(amount: Nat) : async Result<Nat, Text> {
        // Calculate the refund amount based on bonding curve
        let price = calculatePrice(amount);
        let refund = price * amount;

        // Ensure reserve has enough to refund
        if (reserve < refund) {
            return #err("Insufficient reserve");
        }

        // Burn the tokens
        totalSupply -= amount;
        let result = await ICRC2.burn(msg.caller, amount);
        
        switch (result) {
            case (#ok _):
                reserve -= refund;
                return #ok(refund);
            case (#err error):
                return #err(error);
        };
    }

    // Function to get current price
    public query func getCurrentPrice() : async Nat {
        return calculatePrice(1);
    }

    // Function to get total supply
    public query func getTotalSupply() : async Nat {
        return totalSupply;
    }

    // Function to get reserve
    public query func getReserve() : async Nat {
        return reserve;
    }
}
