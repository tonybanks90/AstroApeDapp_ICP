import React, { useState, useEffect, useRef } from "react";
import { useSiweIdentity } from "ic-use-siwe-identity"; // Make sure this path is correct
import Button from "./Button"; // Assuming Button component exists
import { FaCog } from "react-icons/fa";
import EditProfile from "./EditProfile"; // Assuming EditProfile component exists
import DepositWithdraw from "./Deposit&Withdraw"; // Assuming DepositWithdraw component exists
import WalletProfile from "./WalletProfile"; // Assuming WalletProfile component exists
import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal"; // Keep Principal import if used directly
import {
    idlFactory as profileIdlFactory,
    canisterId as profileCanisterId,
} from "../../../declarations/Profile"; // Adjust path as needed

// Import ICP Ledger utilities
import {
    AccountIdentifier,
    LedgerCanister,
    // ICP class might not be needed if not using its methods directly after removing types
} from "@dfinity/ledger-icp";

// --- Configuration ---
const HOST =
    process.env.DFX_NETWORK === "local"
        ? "http://127.0.0.1:4943" // Local replica host
        : "https://icp-api.io"; // Use official boundary node for mainnet

const Profile = () => {
    const { identity /* login, logout, ... */ } = useSiweIdentity();

    // --- Component State ---
    const [rewardsBalance] = useState("12.34 ICP");
    const [ethBalance] = useState("1.25 ETH");
    const [solBalance] = useState("10.5 SOL");

    // State for fetched ICP balance (no TypeScript types)
    const [icpBalance, setIcpBalance] = useState(null);
    const [icpBalanceLoading, setIcpBalanceLoading] = useState(false);
    const [icpBalanceError, setIcpBalanceError] = useState(null);

    // State for user profile data
    const [username, setUsername] = useState("Sample User");
    const [bio, setBio] = useState("Sample Bio");
    const [profilePic, setProfilePic] = useState(
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQtoagYg1XvNp0KTskjA_F7TqVLEvkWqmPYqQ&s"
    );
    const [hasProfile, setHasProfile] = useState(false);

    // State for UI control
    const [isEditing, setIsEditing] = useState(false);
    const [showDeposit, setShowDeposit] = useState(false);

    // Ref for modals
    const modalRef = useRef(null);

    // State for backend actors/helpers (no TypeScript types)
    const [profileBackend, setProfileBackend] = useState(null);
    const [ledger, setLedger] = useState(null);

    // --- Effect: Initialize Agent and Actors ---
    useEffect(() => {
        console.log(`Initializing agent for host: ${HOST}`);
        const agent = new HttpAgent({ host: HOST });

        if (process.env.DFX_NETWORK === "local") {
            agent.fetchRootKey().catch((err) => {
                console.warn("Unable to fetch root key. Check replica:", err);
            });
        }

        // Create LedgerCanister helper (no changes needed here for JSX)
        const ledgerInstance = LedgerCanister.create({ agent });
        setLedger(ledgerInstance);
        console.log("LedgerCanister helper created.");

        if (identity) {
            console.log("Identity found, creating authenticated Profile actor...");
            const agentWithIdentity = new HttpAgent({
                host: HOST,
                identity: identity,
            });

            if (process.env.DFX_NETWORK === "local") {
                agentWithIdentity.fetchRootKey().catch((err) => {
                    console.warn("Unable to fetch root key for identity agent:", err);
                });
            }

            const backendActor = Actor.createActor(profileIdlFactory, {
                agent: agentWithIdentity,
                canisterId: profileCanisterId,
            });
            setProfileBackend(backendActor);
            console.log("Authenticated Profile backend actor created.");
        } else {
            setProfileBackend(null);
            console.log("No identity, clearing Profile backend actor.");
        }
    }, [identity]);

    // --- Effect: Fetch Profile Data ---
    useEffect(() => {
        const fetchProfile = async () => {
            if (identity && profileBackend) {
                const userPrincipal = identity.getPrincipal();
                console.log("Fetching profile for principal:", userPrincipal.toText());
                try {
                    // Assuming getMyProfile takes the principal as an argument
                    const profileResult = await profileBackend.getMyProfile(userPrincipal);

                    // Check based on common agent-js mapping (optional record -> [T] | [])
                    // This logic should still work correctly.
                    if (profileResult && (Array.isArray(profileResult) ? profileResult.length > 0 : true)) {
                        const profile = Array.isArray(profileResult) ? profileResult[0] : profileResult;

                        if (profile && profile.username) { // Check a key field
                            setUsername(profile.username);
                            setBio(profile.bio);
                            setProfilePic(profile.profilePic); // Use field name from Motoko
                            setHasProfile(true);
                            console.log("Profile Data Fetched:", profile);
                        } else {
                            console.log("Profile data structure returned, but seems empty or invalid.");
                            setHasProfile(false);
                        }
                    } else {
                        console.log("No profile data found for this principal.");
                        setHasProfile(false);
                    }
                } catch (error) {
                    console.error("Error fetching profile:", error);
                    setHasProfile(false);
                    // Reset fields?
                    // setUsername("Sample User"); setBio("Sample Bio"); ...
                }
            } else {
                if (!identity) {
                    console.log("Skipping profile fetch: User not logged in.");
                    // Reset profile state
                    setUsername("Sample User");
                    setBio("Sample Bio");
                    setProfilePic("https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQtoagYg1XvNp0KTskjA_F7TqVLEvkWqmPYqQ&s");
                    setHasProfile(false);
                } else {
                    console.log("Skipping profile fetch: Profile backend actor not ready yet.");
                }
            }
        };

        fetchProfile();
    }, [identity, profileBackend]);

    // --- Effect: Check and Save Default Profile (if none exists) ---
    useEffect(() => {
        const checkAndCreateDefaultProfile = async () => {
            if (identity && profileBackend && !hasProfile) {
                const principal = identity.getPrincipal();
                console.log("Attempting to create default profile for:", principal.toText());

                const defaultUsername = "User" + principal.toText().slice(0, 5);
                const defaultBio = "Welcome!";
                const defaultPic = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQtoagYg1XvNp0KTskjA_F7TqVLEvkWqmPYqQ&s";

                try {
                    // *** CHANGED FUNCTION NAME HERE ***
                    // The Motoko function takes 'caller' (principal) first.
                    await profileBackend.createUserProfile(
                        principal,
                        defaultUsername,
                        defaultPic,
                        defaultBio
                    );
                    console.log("Default user profile created successfully.");
                    setUsername(defaultUsername);
                    setBio(defaultBio);
                    setProfilePic(defaultPic);
                    setHasProfile(true);
                } catch (error) {
                    console.error("Error creating default profile:", error);
                     // Check the console for the specific error details
                     // It might still be the delegation target issue if that wasn't fixed.
                }
            }
        };

        checkAndCreateDefaultProfile();
    }, [identity, profileBackend, hasProfile]);


    // --- Effect: Fetch ICP Balance ---
    useEffect(() => {
        const fetchIcpBalance = async () => {
            if (identity && ledger) {
                // ---> START LOCAL MOCKING <---
                if (process.env.DFX_NETWORK === "local") {
                    console.log("Local environment: Mocking ICP balance.");
                    setIcpBalance("100.0000 ICP (Mock)"); // Set a fake balance
                    setIcpBalanceLoading(false);
                    return; // Skip the actual network call
                }
                // ---> END LOCAL MOCKING <---

                setIcpBalanceLoading(true);
                setIcpBalanceError(null);
                setIcpBalance(null);

                try {
                    const principal = identity.getPrincipal();
                    const accountId = AccountIdentifier.fromPrincipal({ principal });
                    console.log(`Workspaceing ICP balance for Account ID: ${accountId.toHex()} (derived from Principal: ${principal.toText()})`);

                    // Call ledger (no type needed for balanceICP variable)
                    const balanceICP = await ledger.accountBalance({ accountIdentifier: accountId });

                    // Format balance - assumes balanceICP has toFormat method
                    // If @dfinity/ledger-icp types were removed, ensure this method exists
                    // It should still work as it's a method on the returned object instance
                    setIcpBalance(`${balanceICP.toFormat({ decimals: 4 })} ICP`);
                    console.log(`Raw balance (e8s): ${balanceICP.e8s().toString()}`);

                } catch (error) { // No ': any' type needed
                    console.error("Error fetching ICP balance:", error);
                    setIcpBalanceError(`Failed to fetch ICP balance`);
                    setIcpBalance(null);
                } finally {
                    setIcpBalanceLoading(false);
                }
            } else {
                setIcpBalance(null);
                setIcpBalanceLoading(false);
                setIcpBalanceError(null);
                if (!identity) {
                    console.log("Skipping ICP balance fetch: User not logged in.");
                } else {
                    console.log("Skipping ICP balance fetch: Ledger helper not ready yet.");
                }
            }
        };

        fetchIcpBalance();
    }, [identity, ledger]);

    // --- Effect: Handle Modal Click Outside ---
    useEffect(() => {
        // No type needed for event parameter
        const handleClickOutside = (event) => {
            // No type assertions ('as any', 'as Node') needed
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setShowDeposit(false);
            }
        };

        if (showDeposit || isEditing) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showDeposit, isEditing]);


    // --- Render Logic (JSX - no changes needed here) ---
    return (
        <div className="lg:mt-8 p-6 lg:p-8">
            {/* Section 1: Profile Header */}
            <section className="flex flex-col lg:flex-row items-center mb-8 gap-4 lg:gap-8">
                <div className="flex items-center">
                    <img
                        src={profilePic}
                        alt="Profile Pic"
                        className="w-20 h-20 lg:w-24 lg:h-24 rounded-full mr-4 object-cover border-2 border-n-5"
                        onError={(e) => { // No type assertion needed for e.target
                            e.target.src = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQtoagYg1XvNp0KTskjA_F7TqVLEvkWqmPYqQ&s";
                        }}
                    />
                    <div className="flex-grow">
                        <h1 className="text-2xl lg:text-3xl font-bold text-n-1 break-all">
                            {identity ? username : "Not Logged In"}
                        </h1>
                        {identity && <p className="text-n-2 mt-1">{bio}</p>}
                    </div>
                </div>

                 {identity && (
                    <div className="flex items-center gap-4 mt-4 lg:mt-0 lg:ml-auto">
                        <button
                            className="text-n-2 hover:text-n-1 transition-colors"
                            onClick={() => setIsEditing(true)}
                            aria-label="Edit Profile"
                            title="Edit Profile"
                        >
                            <FaCog size={24} />
                        </button>
                        <Button onClick={() => setShowDeposit(true)}>Deposit</Button>
                        {/* <Button onClick={logout} variant="danger">Logout</Button> */}
                    </div>
                 )}
            </section>

             {identity && (
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Rewards Balance Card */}
                    <div className="bg-n-8 border border-n-6 rounded-lg p-6 shadow-md">
                        <h2 className="text-xl lg:text-2xl font-semibold mb-3 text-n-1">
                            Rewards Balance
                        </h2>
                        <p className="text-3xl lg:text-4xl font-bold text-green-400 mb-4">
                            {rewardsBalance}
                        </p>
                        <Button onClick={() => alert("Claiming rewards...")} disabled>
                            Claim (Soon)
                        </Button>
                    </div>

                    {/* Wallet Balance Card */}
                    <div className="bg-n-8 border border-n-6 rounded-lg p-6 shadow-md">
                        <h2 className="text-xl lg:text-2xl font-semibold mb-3 text-n-1">
                            Wallet Balance
                        </h2>
                        <div className="space-y-2">
                            <p className="text-lg text-n-2">
                                ICP:{" "}
                                {icpBalanceLoading ? (
                                    <span className="text-sm text-n-4">Loading...</span>
                                ) : icpBalanceError ? (
                                    <span className="text-sm text-red-500">{icpBalanceError}</span>
                                ) : icpBalance !== null ? (
                                    <span className="font-semibold text-n-1">{icpBalance}</span>
                                ) : (
                                    <span className="text-sm text-n-4">N/A</span>
                                )}
                            </p>
                            <p className="text-lg text-n-2">ETH: <span className="font-semibold text-n-1">{ethBalance}</span></p>
                            <p className="text-lg text-n-2">SOL: <span className="font-semibold text-n-1">{solBalance}</span></p>
                        </div>
                    </div>
                </section>
             )}

             {identity && <WalletProfile />}

            {isEditing && (
                <EditProfile
                    currentUsername={username}
                    currentBio={bio}
                    currentProfilePic={profilePic}
                    onClose={() => setIsEditing(false)}
                    identity={identity}
                    profileBackend={profileBackend}
                    onProfileUpdate={(updatedData) => {
                        console.log("Profile updated successfully:", updatedData);
                        setUsername(updatedData.username);
                        setBio(updatedData.bio);
                        // Use correct field name from backend if different (e.g., updatedData.profilePic)
                        setProfilePic(updatedData.profilePicUrl || updatedData.profilePic);
                        setHasProfile(true);
                        setIsEditing(false);
                    }}
                />
            )}

            {showDeposit && (
                <div ref={modalRef}>
                    <DepositWithdraw onClose={() => setShowDeposit(false)} />
                </div>
            )}

            {!identity && (
                <div className="text-center text-n-2 mt-10 border border-n-6 p-6 rounded-lg bg-n-8">
                    <p className="text-lg">Please connect your wallet to view your profile and balances.</p>
                    {/* <Button onClick={login} className="mt-4">Connect Wallet</Button> */}
                </div>
            )}
        </div>
    );
};

export default Profile;