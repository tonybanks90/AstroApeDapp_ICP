Bonding Curve for ICRC-2 Tokens on Internet Computer
This document provides an overview and instructions for implementing a bonding curve mechanism for ICRC-2 tokens on the Internet Computer using Motoko.

Overview
The bonding curve is a smart contract that allows the dynamic pricing of tokens based on the current supply and demand. As users buy tokens, the price increases, and as users sell tokens, the price decreases. This particular implementation uses a linear bonding curve but can be customized to suit other types of curves (e.g., exponential or logarithmic).

Key Components
1. State Variables
totalSupply : Nat: Tracks the total supply of the ICRC-2 tokens.
reserve : Nat: Holds the base tokens (e.g., ICP) collected from users buying ICRC-2 tokens.
initialPrice : Nat: The starting price for the tokens in base units (e.g., ICP).
slope : Nat: Determines how steeply the price increases with the supply.
2. Bonding Curve Logic
calculatePrice(amountToBuy: Nat) : Nat: A function to calculate the price based on the current total supply and the amount of tokens being purchased.
buyTokens(amount: Nat) : async Result<Nat, Text>: A function to buy tokens, increasing the total supply and updating the reserve.
sellTokens(amount: Nat) : async Result<Nat, Text>: A function to sell tokens, decreasing the total supply and refunding the user based on the current price.
3. Token Management
mint(caller: Principal, amount: Nat): Mints new ICRC-2 tokens for the buyer.
burn(caller: Principal, amount: Nat): Burns the ICRC-2 tokens when a user sells them.
Functions
calculatePrice(amountToBuy: Nat) : Nat
Calculates the current price for a given amount of tokens based on the bonding curve formula:

motoko
Copy code
func calculatePrice(amountToBuy: Nat) : Nat {
    return initialPrice + (slope * totalSupply) + (slope * amountToBuy / 2);
}
buyTokens(amount: Nat) : async Result<Nat, Text>
Allows users to buy tokens. The price is determined by the bonding curve, and the cost is deducted from the user's balance. Tokens are minted and the reserve is updated.

motoko
Copy code
public shared(msg) func buyTokens(amount: Nat) : async Result<Nat, Text> {
    let price = calculatePrice(amount);
    let totalCost = price * amount;

    if (msg.callerBalance < totalCost) {
        return #err("Insufficient funds");
    }

    reserve += totalCost;
    totalSupply += amount;
    let result = await ICRC2.mint(msg.caller, amount);
    
    switch (result) {
        case (#ok _):
            return #ok(amount);
        case (#err error):
            return #err(error);
    };
}
sellTokens(amount: Nat) : async Result<Nat, Text>
Allows users to sell tokens. The refund is calculated based on the current price, and the tokens are burned.

motoko
Copy code
public shared(msg) func sellTokens(amount: Nat) : async Result<Nat, Text> {
    let price = calculatePrice(amount);
    let refund = price * amount;

    if (reserve < refund) {
        return #err("Insufficient reserve");
    }

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
getCurrentPrice() : async Nat
A query function to retrieve the current price of a single token.

motoko
Copy code
public query func getCurrentPrice() : async Nat {
    return calculatePrice(1);
}
getTotalSupply() : async Nat
A query function to retrieve the total supply of tokens.

motoko
Copy code
public query func getTotalSupply() : async Nat {
    return totalSupply;
}
getReserve() : async Nat
A query function to retrieve the current reserve.

motoko
Copy code
public query func getReserve() : async Nat {
    return reserve;
}
Customization
Initial Price: Adjust initialPrice to set the starting price of the tokens.
Slope: Modify the slope value to control how fast the price changes as the supply increases.
Curve Type: Replace the linear calculation in calculatePrice with more complex mathematical functions for different curve behaviors (e.g., exponential or logarithmic).
Integration
To integrate this bonding curve into your DApp, replace YOUR_ICRC2_TOKEN_CANISTER_ID with the actual canister ID of your ICRC-2 token in the code. Ensure that your DApp has the necessary permissions to interact with the ICRC-2 canister for minting and burning tokens.

Conclusion
This implementation provides a basic structure for a bonding curve mechanism for ICRC-2 tokens on the Internet Computer. By customizing the price calculation and integrating it into your DApp, you can create dynamic token pricing models that adapt to market demand.

Feel free to expand and optimize the code to fit your project's specific needs.