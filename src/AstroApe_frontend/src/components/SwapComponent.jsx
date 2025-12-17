import React, { useState, useEffect } from "react";
import Input from "./Input";
import Button from "./Button";
import { Card, CardContent } from "./Card";
import AddMinusLiq from "./addminusLiq";
import SlippageCard from "./SlippageCard";
import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { idlFactory as bondingCurveIdl } from "../../../declarations/BondingCurve";
import { idlFactory as ckbtcLedgerIdl } from "../../../declarations/ckbtc_ledger";

const SwapComponent = ({ tokenMetadata, tokenId, onClose, identity }) => {
  const ticker = tokenMetadata ? tokenMetadata.symbol : "TOKEN";
  const basepair = "ckBTC"; // Supporting ckBTC only for now

  const [mode, setMode] = useState("trades");
  const [view, setView] = useState("buy");
  const [amount, setAmount] = useState("");
  const [percentage, setPercentage] = useState(0);
  const [slippage, setSlippage] = useState(0.5);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");

  const [ckBtcBalance, setCkBtcBalance] = useState(0);
  const [tokenBalance, setTokenBalance] = useState(0);

  // Canister IDs
  // Canister IDs
  const BONDING_CURVE_CANISTER_ID = process.env.CANISTER_ID_BONDINGCURVE;
  // Assuming Vault is managing permissions, but we need to approve Vault or BondingCurve? 
  // In the script we approved the Vault: vizcg-th777-77774-qaaea-cai
  // BUT the bonding curve functions 'buy' and 'sell' transfer FROM the user.
  // The BondingCurve calls 'pullFunds' on Vault.
  // The Vault pulls from User. 
  // So User must approve VAULT.
  const VAULT_CANISTER_ID = process.env.CANISTER_ID_VAULT;
  const CKBTC_LEDGER_CANISTER_ID = process.env.CANISTER_ID_CKBTC_LEDGER;

  const fetchBalances = async () => {
    if (!identity) return;
    try {
      const agent = new HttpAgent({ identity }); // Uses the user's identity
      // For local dev
      // For local dev - explicitly check hostname or DFX_NETWORK
      const isLocal = process.env.DFX_NETWORK === "local" || process.env.NODE_ENV === "development" || window.location.hostname.includes("localhost");

      if (isLocal) {
        // console.log("Fetching root key for local development...");
        try {
          await agent.fetchRootKey();
          // console.log("Root key fetched.");
        } catch (err) {
          console.warn("Unable to fetch root key. Check to ensure that your local replica is running");
          console.error(err);
        }
      }

      // ckBTC Ledger
      const ckActor = Actor.createActor(ckbtcLedgerIdl, {
        agent,
        canisterId: CKBTC_LEDGER_CANISTER_ID,
      });

      const userPrincipal = identity.getPrincipal();

      // Get ckBTC Balance
      const balance = await ckActor.icrc1_balance_of({ owner: userPrincipal, subaccount: [] });
      setCkBtcBalance(Number(balance));

      // Get Token Balance (if token exists)
      if (tokenId) {
        // Token is also an ICRC-1 ledger
        // We can use the same generic ledger interface or import Token IDL if available.
        // Using ckbtcLedgerIdl is fine for standard ICRC queries
        const tokenActor = Actor.createActor(ckbtcLedgerIdl, {
          agent,
          canisterId: tokenId,
        });
        const tBal = await tokenActor.icrc1_balance_of({ owner: userPrincipal, subaccount: [] });
        setTokenBalance(Number(tBal));
      }

    } catch (e) {
      console.error("Error fetching balances:", e);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [identity, tokenId]);


  const handleAction = async () => {
    if (!identity) {
      alert("Please connect your wallet first.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      alert("Enter a valid amount");
      return;
    }

    // Validate Token ID
    let principalId;
    try {
      principalId = Principal.fromText(tokenId);
    } catch (e) {
      alert("Invalid Token ID");
      return;
    }

    setIsLoading(true);
    setStatus("Initiating...");

    try {
      const agent = new HttpAgent({ identity });
      const isLocal = process.env.DFX_NETWORK === "local" || process.env.NODE_ENV === "development" || window.location.hostname.includes("localhost");
      if (isLocal) {
        await agent.fetchRootKey();
      }

      const bondingCurve = Actor.createActor(bondingCurveIdl, {
        agent,
        canisterId: BONDING_CURVE_CANISTER_ID,
      });

      const ckActor = Actor.createActor(ckbtcLedgerIdl, {
        agent,
        canisterId: CKBTC_LEDGER_CANISTER_ID,
      });

      // Parse amount (assuming 8 decimals for now, ideally fetch decimals)
      const amountSatoshis = BigInt(Math.floor(parseFloat(amount) * 100_000_000));
      const CKBTC_FEE = 10n; // Standard ICRC-1 fee

      if (view === "buy") {
        // BUY FLOW
        // 1. Approve Vault to spend ckBTC (Amount + Fee)
        setStatus("Approving Vault...");
        const approveResult = await ckActor.icrc2_approve({
          spender: { owner: Principal.fromText(VAULT_CANISTER_ID), subaccount: [] },
          amount: amountSatoshis + CKBTC_FEE,
          fee: [],
          memo: [],
          from_subaccount: [],
          created_at_time: [],
          expires_at: [],
          expected_allowance: []
        });

        if ("Err" in approveResult) {
          throw new Error("Approval failed: " + JSON.stringify(approveResult.Err, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
          ));
        }

        // 2. Call Buy
        setStatus("Executing Buy...");
        const buyResult = await bondingCurve.buy(principalId, amountSatoshis);

        if ("ok" in buyResult) {
          setStatus("Success!");
          alert(`Buy Successful! Received ${Number(buyResult.ok)} tokens.`);
          fetchBalances();
        } else {
          throw new Error("Buy Failed: " + buyResult.err);
        }

      } else {
        // SELL FLOW
        setStatus("Approving Token Transfer...");

        // Create actor for the Token being traded
        const tokenActor = Actor.createActor(ckbtcLedgerIdl, {
          agent,
          canisterId: tokenId,
        });

        const TOKEN_FEE = 10n;

        const approveResult = await tokenActor.icrc2_approve({
          spender: { owner: Principal.fromText(VAULT_CANISTER_ID), subaccount: [] },
          amount: amountSatoshis + TOKEN_FEE,
          fee: [],
          memo: [],
          from_subaccount: [],
          created_at_time: [],
          expires_at: [],
          expected_allowance: []
        });

        if ("Err" in approveResult) {
          throw new Error("Token Approval failed: " + JSON.stringify(approveResult.Err, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
          ));
        }

        setStatus("Executing Sell...");
        const sellResult = await bondingCurve.sell(principalId, amountSatoshis);

        if ("ok" in sellResult) {
          setStatus("Success!");
          alert(`Sell Successful! Received ${Number(sellResult.ok)} ckBTC.`);
          fetchBalances();
        } else {
          throw new Error("Sell Failed: " + sellResult.err);
        }
      }

    } catch (e) {
      console.error(e);
      alert("Transaction failed: " + e.message);
      setStatus("Failed");
    } finally {
      setIsLoading(false);
    }
  };


  const resetAmount = () => {
    setAmount("");
    setPercentage(0);
  };

  const getEstimatedOutput = () => {
    // Placeholder for actual curve calculation
    const rate = 1;
    const output = parseFloat(amount || 0) * rate;
    const minReceived = output * (1 - slippage / 100);
    return minReceived.toFixed(4);
  };

  return (
    <Card className="relative w-full max-w-md bg-n-8 border border-n-6 shadow-xl rounded-xl p-4 space-y-4">
      {/* Top Bar */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-1">
          <button
            onClick={() => {
              setMode("trades");
              setView("buy");
            }}
            className={`px-3 py-1 text-sm font-medium rounded-md transition w-full ${mode === "trades"
              ? "bg-color-1 text-white"
              : "bg-n-6 text-gray-400 hover:bg-n-5"
              }`}
          >
            Trades
          </button>
          <button
            onClick={() => {
              setMode("liquidity");
              setView("liq");
            }}
            className={`px-3 py-1 text-sm font-medium rounded-md transition w-full ${mode === "liquidity"
              ? "bg-color-1 text-white"
              : "bg-n-6 text-gray-400 hover:bg-n-5"
              }`}
          >
            Liquidity
          </button>
        </div>

        {/* Close (mobile only) */}
        <button
          className="lg:hidden text-white text-lg font-bold"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <CardContent className="space-y-2">
        {/* Buy/Sell Toggle */}
        {mode === "trades" && (
          <div className="flex rounded-md overflow-hidden border border-n-6 w-full">
            {["buy", "sell"].map((type) => (
              <Button
                key={type}
                variant={view === type ? "default" : "ghost"}
                className={`flex-1 py-2 transition ${view === type
                  ? "bg-color-5 text-white"
                  : "bg-n-7 text-white/50 hover:text-white"
                  }`}
                onClick={() => setView(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
        )}

        {/* Main Content */}
        {view === "liq" ? (
          <AddMinusLiq tokenId={tokenId} />
        ) : (
          <>
            {/* Input */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <label className="text-gray-300 font-medium">{view === "buy" ? `Buy ${ticker}` : `Sell ${ticker}`}</label>
                <span className="text-gray-400">Balance: {view === "buy" ? (ckBtcBalance / 1e8).toFixed(4) : (tokenBalance / 1e8).toFixed(4)}</span>
              </div>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2 border border-n-6 rounded-md bg-n-7 text-white placeholder-gray-500"
                placeholder={`Enter amount of ${view === "buy" ? basepair : ticker}`}
                min="0"
              />
            </div>

            {/* Amount Buttons */}
            <div className="grid grid-cols-4 gap-1 w-full">
              {/* Simplified for verification - just set raw amounts for now or percentage of logic */}
              {[0.25, 0.5, 0.75, 1].map((pct) => (
                <button
                  key={pct}
                  className="py-2 rounded-md text-xs transition border w-full text-gray-300 border-n-6 hover:bg-n-6"
                  onClick={() => {
                    const bal = view === "buy" ? ckBtcBalance : tokenBalance;
                    setAmount(((bal * pct) / 100_000_000).toString()); // Converting back to float for input
                  }}
                >
                  {pct * 100}%
                </button>
              ))}
            </div>

            {/* Slippage + Output */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 bg-n-7 rounded-md border border-n-6 w-full">
              <p className="text-xs text-gray-400">
                receive approx:{" "}
                <span className="text-white font-medium">
                  {getEstimatedOutput()} {view === "buy" ? ticker : basepair}
                </span>
              </p>
              <SlippageCard slippage={slippage} onChange={setSlippage} />
            </div>

            {/* Reset & Order */}
            <div className="flex gap-2 w-full">
              <button
                className="flex-1 py-2 border rounded-md text-gray-400 hover:text-white hover:bg-n-6 transition text-sm"
                onClick={resetAmount}
                disabled={isLoading}
              >
                Reset
              </button>
              <Button
                className={`flex-1 py-2 bg-color-5 text-white rounded-md hover:opacity-90 transition text-sm ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={handleAction}
                disabled={isLoading}
              >
                {isLoading ? status : (!identity ? "Connect Wallet" : "Place Order")}
              </Button>
            </div>
            {status && <p className="text-xs text-center text-gray-400 mt-2">{status}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SwapComponent;
