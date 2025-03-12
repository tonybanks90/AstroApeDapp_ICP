import React, { useState } from "react";
import Button from "./Button"; // Assuming you have a Button component
import { ConnectButton } from "@rainbow-me/rainbowkit"; // Import RainbowKit ConnectButton

const ConnectWallet = () => {
    const [selectedChain, setSelectedChain] = useState(null);
    const [walletOptions, setWalletOptions] = useState([]);
    const [walletAddress, setWalletAddress] = useState(""); // State for wallet address
    const [isCardVisible, setIsCardVisible] = useState(true); // State to control card visibility

    const { login, logout: authLogout } = useAuth(); // Get the login and logout functions from useAuth

    const handleSelectChain = (chain) => {
        setSelectedChain(chain);
        if (chain === "Ethereum") {
            setWalletOptions(["MetaMask", "WalletConnect"]);
        } else if (chain === "Internet Computer") {
            setWalletOptions(["Plug Wallet", "NFID", "Internet Identity"]);
        }
    };

    const handleConnectWallet = async (wallet) => {
        if (wallet === "MetaMask") {
            if (window.ethereum) {
                try {
                    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                    setWalletAddress(accounts[0]); // Update state with MetaMask address
                } catch (error) {
                    alert("Error connecting to MetaMask: " + error.message);
                }
            } else {
                alert("MetaMask not installed!");
            }
        } else if (wallet === "WalletConnect") {
            alert("WalletConnect integration not implemented yet.");
        } else if (wallet === "Plug Wallet") {
            if (window.ic && window.ic.plug) {
                try {
                    const connected = await window.ic.plug.requestConnect();
                    if (connected) {
                        const principalId = await window.ic.plug.getPrincipal();
                        setWalletAddress(principalId.toText());
                    } else {
                        alert("Plug Wallet connection failed.");
                    }
                } catch (error) {
                    alert("Error connecting to Plug Wallet: " + error.message);
                }
            } else {
                alert("Plug Wallet not installed!");
            }
        } else if (wallet === "NFID") {
            if (window.nfid) {
                try {
                    const nfidClient = window.nfid;
                    await nfidClient.authenticate();
                    const userId = nfidClient.getUser();
                    setWalletAddress(userId);
                } catch (error) {
                    alert("Error connecting to NFID: " + error.message);
                }
            } else {
                alert("NFID SDK not loaded!");
            }
        } else if (wallet === "Internet Identity") {
            login();
        }
    };

    const handleLogout = () => {
        setWalletAddress("");
        authLogout();
    };

    return (
        <div className="bg-n-8 border border-n-6 rounded-lg p-6 shadow-lg mt-8">
            <h2 className="text-2xl font-bold text-n-1 mb-4">Connect Wallet</h2>
            <ConnectButton /> {/* RainbowKit Connect Button */}
            {isCardVisible && (
                <div>
                    {selectedChain ? (
                        <div>
                            <h3 className="text-lg font-semibold text-n-1 mb-4">Select Wallet</h3>
                            {walletOptions.map((wallet, index) => (
                                <Button key={index} onClick={() => handleConnectWallet(wallet)} className="mb-4">
                                    {wallet}
                                </Button>
                            ))}
                            <Button onClick={() => { setIsCardVisible(false); setSelectedChain(null); }} className="mt-4">
                                Back
                            </Button>
                        </div>
                    ) : (
                        <div>
                            <Button onClick={() => handleSelectChain("Ethereum")} className="mb-4">
                                Connect to Ethereum
                            </Button>
                            <Button onClick={() => handleSelectChain("Internet Computer")} className="mb-4">
                                Connect to Internet Computer
                            </Button>
                        </div>
                    )}
                </div>
            )}
            {walletAddress && (
                <div className="mt-4">
                    <p className="text-lg font-semibold text-n-1">Connected Wallet Address:</p>
                    <p className="text-base text-n-2">{walletAddress}</p>
                    <Button onClick={handleLogout} className="mt-4 bg-red-500 text-white">
                        Logout
                    </Button>
                </div>
            )}
        </div>
    );
};

export default ConnectWallet;