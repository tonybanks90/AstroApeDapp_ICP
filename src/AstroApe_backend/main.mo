import ICRC2 "your/icrc2/library"; // Import the ICRC-2 library

actor TokenDeployer {

    public type TokenParams = {
        name: Text;
        ticker: Text;
        logo: ?Text;
        owner: Principal;
    };

    public type TokenDetails = {
        name: Text;
        ticker: Text;
        logo: ?Text;
        decimals: Nat8;
        totalSupply: Nat;
        owner: Principal;
    };

    public func deployToken(params: TokenParams) : async Principal {
        let newToken = ICRC2.Token({
            name = params.name;
            ticker = params.ticker;
            logo = params.logo;
            decimals = 18;
            totalSupply = 1_000_000_000 * pow(10, 18); // 1 Billion with 18 decimals
            owner = params.owner;
        });

        let canisterId = await ICRC2.deploy(newToken); // Assuming you have a function to deploy a new canister
        return canisterId;
    }
}
