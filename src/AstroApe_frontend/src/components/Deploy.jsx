import React, { useState } from "react";
import { FiUpload } from "react-icons/fi";
import Button from "./Button";
import Input from "./Input";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory, canisterId } from "../../../declarations/TokenFactory";

// 🎯 Setup agent + actor for TokenFactory - ICP Playground Compatible
const createTokenFactoryActor = async () => {
  // Default to mainnet unless explicitly set to local
  const isLocal = process.env.DFX_NETWORK === "local" || process.env.NODE_ENV === "development";
  
  const agent = new HttpAgent({
    host: isLocal ? "http://127.0.0.1:4943" : "https://icp-api.io"
  });
  
  // Only fetch root key in local development and handle errors
  if (isLocal) {
    try {
      await agent.fetchRootKey();
      console.log("✅ Connected to local replica");
    } catch (err) {
      console.warn("⚠️ Couldn't connect to local replica, falling back to mainnet");
      console.error(err);
      
      // Create new agent for mainnet
      const mainnetAgent = new HttpAgent({
        host: "https://icp-api.io"
      });
      
      return Actor.createActor(idlFactory, { 
        agent: mainnetAgent, 
        canisterId: process.env.CANISTER_ID_TOKENFACTORY || "umunu-kh777-77774-qaaca-cai",
      });
    }
  }
  
  return Actor.createActor(idlFactory, { 
    agent, 
    canisterId: process.env.CANISTER_ID_TOKENFACTORY || "umunu-kh777-77774-qaaca-cai",
  });
};

const ImageUpload = ({ label, id, onImageChange, imageSrc }) => {
  return (
    <div className="flex flex-col items-center">
      <label className="block text-lg font-medium text-n-1 mb-2" htmlFor={id}>
        {label}
      </label>
      <div className="relative w-32 h-32 border border-n-6 bg-n-8 rounded-md flex items-center justify-center overflow-hidden">
        {imageSrc ? (
          <img src={imageSrc} alt="Uploaded" className="object-cover h-full w-full" />
        ) : (
          <FiUpload className="text-n-1/50 text-3xl" />
        )}
        <input
          id={id}
          type="file"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={onImageChange}
          accept="image/*"
        />
      </div>
    </div>
  );
};

const CreatePage = () => {
  const [logo, setLogo] = useState(null);
  const [selectedBaseToken, setSelectedBaseToken] = useState("BITCOIN"); // default BITCOIN
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [telegram, setTelegram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [discountCode, setDiscountCode] = useState("");

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 1MB for ICP Playground)
      if (file.size > 1024 * 1024) {
        setErrorMsg("Image file too large. Please select an image under 1MB.");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Random ID for runes ticker
  const randomId = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  const runesTickerValue =
    selectedBaseToken === "BITCOIN"
      ? `${ticker ? ticker : "[short-ticker]"}.ID.${randomId}.ASTRO`
      : "";

  // 🎯 Handle token creation
  const handleCreateToken = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      // Validation
      if (!name.trim()) throw new Error("Token name is required");
      if (!ticker.trim()) throw new Error("Token ticker is required");
      if (!description.trim()) throw new Error("Token description is required");

      // Create actor instance for this request
      const tokenFactory = await createTokenFactoryActor();
      
      // Convert logo into expected "LogoData"
      const logoData = logo
        ? { ImageUrl: logo } // if using URL/dataURI
        : { ImageUrl: "" };

      console.log("Creating token with params:", {
        name,
        ticker,
        logoData,
        description,
        website: website ? [website] : [],
        telegram: telegram ? [telegram] : [],
        twitter: twitter ? [twitter] : []
      });

      const result = await tokenFactory.createIcrc2Token(
        name.trim(),
        ticker.trim().toUpperCase(),
        logoData,
        description.trim(),
        website.trim() ? [website.trim()] : [],
        telegram.trim() ? [telegram.trim()] : [],
        twitter.trim() ? [twitter.trim()] : []
      );

      console.log("Token creation result:", result);

      if ("ok" in result) {
        setSuccessMsg(`✅ Token created successfully! Canister ID: ${result.ok}`);
        
        // Reset form on success
        setLogo(null);
        setTicker("");
        setName("");
        setDescription("");
        setWebsite("");
        setTelegram("");
        setTwitter("");
        setDiscountCode("");
      } else {
        setErrorMsg(`❌ Error: ${result.err}`);
      }
    } catch (err) {
      console.error("Error creating token:", err);
      setErrorMsg(`❌ ${err.message || "Unexpected error occurred"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lg:pt-20 p-2 mb-12 lg:px-32">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-n-1">Create Your Token</h1>

        <form className="space-y-6" onSubmit={handleCreateToken}>
          {/* Select Base Token */}
          <div>
            <label className="block text-lg font-medium text-n-1 mb-2">Select Base Token</label>
            <div className="flex flex-wrap gap-4">
              {["BITCOIN", "ETHEREUM", "SOLANA", "SUI"].map((token) => (
                <button
                  key={token}
                  type="button"
                  className={`px-4 py-2 border rounded-md transition-colors ${
                    selectedBaseToken === token 
                      ? "bg-color-1 text-white border-color-1" 
                      : "bg-n-8 text-n-1 border-n-6 hover:bg-n-7"
                  }`}
                  onClick={() => setSelectedBaseToken(token)}
                >
                  {token}
                </button>
              ))}
            </div>
          </div>

          {/* Logo + Token Name + Ticker */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ImageUpload label="Logo" id="logo" onImageChange={handleLogoChange} imageSrc={logo} />

            <div className="flex flex-col space-y-6">
              <div>
                <label htmlFor="tokenName" className="block text-lg font-medium text-n-1 mb-2">
                  Token Name *
                </label>
                <Input
                  id="tokenName"
                  name="tokenName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Astro Token"
                  required
                />
              </div>
              <div>
                <label htmlFor="tokenSymbol" className="block text-lg font-medium text-n-1 mb-2">
                  Ticker Symbol *
                </label>
                <Input
                  id="tokenSymbol"
                  name="tokenSymbol"
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="e.g. ASTRO"
                  maxLength={10}
                  required
                />
              </div>

              {selectedBaseToken === "BITCOIN" && (
                <div>
                  <label htmlFor="runesTicker" className="block text-lg font-medium text-n-1 mb-2">
                    Runes Ticker
                  </label>
                  <Input 
                    id="runesTicker" 
                    name="runesTicker" 
                    type="text" 
                    value={runesTickerValue} 
                    readOnly 
                    className="bg-n-7 text-n-3"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-lg font-medium text-n-1 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-n-6 rounded-md text-n-1 bg-n-8 focus:outline-none focus:ring-2 focus:ring-color-1 transition duration-150 ease-in-out"
              rows="4"
              placeholder="Describe your token's purpose and utility..."
              required
              maxLength={500}
            ></textarea>
            <p className="text-sm text-n-4 mt-1">{description.length}/500 characters</p>
          </div>

          {/* Optional Links */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-n-1 mb-1">Website</label>
              <Input 
                placeholder="https://example.com" 
                value={website} 
                onChange={(e) => setWebsite(e.target.value)}
                type="url"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-n-1 mb-1">Telegram</label>
              <Input 
                placeholder="https://t.me/your-channel" 
                value={telegram} 
                onChange={(e) => setTelegram(e.target.value)}
                type="url"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-n-1 mb-1">Twitter</label>
              <Input 
                placeholder="https://twitter.com/your-handle" 
                value={twitter} 
                onChange={(e) => setTwitter(e.target.value)}
                type="url"
              />
            </div>
          </div>

          {/* Supply / Fee / Payment Row */}
          <div className="flex flex-wrap gap-6 text-n-1 bg-n-8 p-4 rounded-md border border-n-6">
            <span className="flex items-center">
              <span className="text-n-4 mr-2">Percent Supply:</span>
              <span className="font-semibold">50%</span>
            </span>
            <span className="flex items-center">
              <span className="text-n-4 mr-2">Launch Fee:</span>
              <span className="font-semibold">0.01 {selectedBaseToken}</span>
            </span>
            <span className="flex items-center">
              <span className="text-n-4 mr-2">Total Payment:</span>
              <span className="font-semibold">1.01 {selectedBaseToken}</span>
            </span>
          </div>

          {/* Discount Code */}
          <div>
            <label htmlFor="discountCode" className="block text-lg font-medium text-n-1 mb-2">
              Discount Code (Optional)
            </label>
            <Input 
              id="discountCode" 
              name="discountCode" 
              type="text" 
              placeholder="Enter discount code to create token for free"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
            />
          </div>

          {/* Error + Success Messages */}
          {errorMsg && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md">
              <p className="text-red-400">{errorMsg}</p>
            </div>
          )}
          {successMsg && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-md">
              <p className="text-green-400">{successMsg}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full z-40 relative" 
            disabled={loading || !name || !ticker || !description}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Token...
              </span>
            ) : (
              "Create Token"
            )}
          </Button>

          {/* Create to Earn Section */}
          <div className="mt-6 p-6 border border-n-6 bg-gradient-to-r from-color-1/10 to-color-2/10 rounded-md text-center">
            <h2 className="text-lg font-bold text-n-1 mb-2">Create to Earn</h2>
            <p className="text-n-1/80">
              Earn 0.001 {selectedBaseToken} when a token you create successfully bonds to the AMM!
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePage;