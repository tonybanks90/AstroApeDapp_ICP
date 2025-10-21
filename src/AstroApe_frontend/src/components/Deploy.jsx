import React, { useState } from "react";
import { FiUpload, FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import { SiBitcoin, SiEthereum, SiSolana } from "react-icons/si";
import Button from "./Button";
import Input from "./Input";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory, canisterId } from "../../../declarations/TokenFactory";

// 🎯 Setup agent + actor for TokenFactory - ICP Playground Compatible
const createTokenFactoryActor = async () => {
  const isLocal = process.env.DFX_NETWORK === "local" || process.env.NODE_ENV === "development";
  
  const agent = new HttpAgent({
    host: isLocal ? "http://127.0.0.1:4943" : "https://icp-api.io"
  });
  
  if (isLocal) {
    try {
      await agent.fetchRootKey();
      console.log("✅ Connected to local replica");
    } catch (err) {
      console.warn("⚠️ Couldn't connect to local replica, falling back to mainnet");
      console.error(err);
      
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
      <label className="block text-sm font-semibold text-n-1/90 mb-3 uppercase tracking-wider" htmlFor={id}>
        {label}
      </label>
      <div className="relative w-32 h-32 border-2 border-dashed border-n-6 bg-n-7/50 rounded-xl flex items-center justify-center overflow-hidden hover:border-color-1 transition-all duration-300 group cursor-pointer">
        {imageSrc ? (
          <>
            <img src={imageSrc} alt="Uploaded" className="object-cover h-full w-full" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <FiUpload className="text-white text-2xl" />
            </div>
          </>
        ) : (
          <div className="text-center">
            <FiUpload className="text-n-4 text-3xl mx-auto mb-2" />
            <span className="text-xs text-n-4">Upload Logo</span>
          </div>
        )}
        <input
          id={id}
          type="file"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={onImageChange}
          accept="image/*"
        />
      </div>
      <p className="text-xs text-n-4 mt-2">Max 1MB</p>
    </div>
  );
};

const CreatePage = () => {
  const [logo, setLogo] = useState(null);
  const [selectedBaseToken, setSelectedBaseToken] = useState("BITCOIN");
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

  const chains = [
    { 
      name: "BITCOIN", 
      icon: SiBitcoin, 
      active: true, 
      color: "from-orange-500 to-yellow-600",
      borderColor: "border-orange-500/50",
      bgColor: "bg-orange-500/10",
      textColor: "text-orange-400"
    },
    { 
      name: "ETHEREUM", 
      icon: SiEthereum, 
      active: true, 
      color: "from-blue-500 to-purple-600",
      borderColor: "border-blue-500/50",
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-400"
    },
    { 
      name: "SOLANA", 
      icon: SiSolana, 
      active: false, 
      color: "from-purple-500 to-pink-600",
      borderColor: "border-purple-500/50",
      bgColor: "bg-purple-500/10",
      textColor: "text-purple-400"
    }
  ];

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
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

  const randomId = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  const runesTickerValue =
    selectedBaseToken === "BITCOIN"
      ? `${ticker ? ticker : "[TICKER]"}.ID.${randomId}.ASTRO`
      : "";

  const handleCreateToken = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (!name.trim()) throw new Error("Token name is required");
      if (!ticker.trim()) throw new Error("Token ticker is required");
      if (!description.trim()) throw new Error("Token description is required");

      const tokenFactory = await createTokenFactoryActor();
      
      const logoData = logo
        ? { ImageUrl: logo }
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
        setSuccessMsg(`Token created successfully! Canister ID: ${result.ok}`);
        
        setLogo(null);
        setTicker("");
        setName("");
        setDescription("");
        setWebsite("");
        setTelegram("");
        setTwitter("");
        setDiscountCode("");
      } else {
        setErrorMsg(`Error: ${result.err}`);
      }
    } catch (err) {
      console.error("Error creating token:", err);
      setErrorMsg(`${err.message || "Unexpected error occurred"}`);
    } finally {
      setLoading(false);
    }
  };

  const selectedChain = chains.find(c => c.name === selectedBaseToken);

  return (
    <div className="min-h-screen bg-n-8 lg:pt-24 pt-20 pb-16 px-4 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-color-1 via-color-2 to-color-1 bg-clip-text text-transparent">
            Create Your Token
          </h1>
          <p className="text-n-3 text-lg">
            Launch your token on the blockchain in minutes
          </p>
        </div>

        <form className="space-y-8" onSubmit={handleCreateToken}>
          {/* Chain Selection */}
          <div className="bg-n-7 border border-n-6 rounded-2xl p-6 lg:p-8">
            <label className="block text-sm font-semibold text-n-1/90 mb-4 uppercase tracking-wider">
              Select Blockchain
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {chains.map((chain) => {
                const Icon = chain.icon;
                const isSelected = selectedBaseToken === chain.name;
                
                return (
                  <button
                    key={chain.name}
                    type="button"
                    disabled={!chain.active}
                    className={`relative p-5 border-2 rounded-xl transition-all duration-300 ${
                      chain.active
                        ? isSelected
                          ? `${chain.borderColor} ${chain.bgColor} shadow-lg scale-105`
                          : "border-n-6 bg-n-8 hover:border-n-5"
                        : "border-n-6 bg-n-8 opacity-40 cursor-not-allowed"
                    }`}
                    onClick={() => chain.active && setSelectedBaseToken(chain.name)}
                  >
                    {!chain.active && (
                      <div className="absolute top-2 right-2 bg-n-6 text-n-4 text-xs px-2 py-1 rounded-md">
                        Coming Soon
                      </div>
                    )}
                    <div className="flex items-center justify-center space-x-3">
                      <Icon className={`text-3xl ${isSelected && chain.active ? chain.textColor : 'text-n-4'}`} />
                      <span className={`font-semibold text-lg ${isSelected && chain.active ? 'text-n-1' : 'text-n-3'}`}>
                        {chain.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Token Details */}
          <div className="bg-n-7 border border-n-6 rounded-2xl p-6 lg:p-8">
            <h2 className="text-xl font-bold text-n-1 mb-6">Token Details</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Logo Upload */}
              <ImageUpload 
                label="Logo" 
                id="logo" 
                onImageChange={handleLogoChange} 
                imageSrc={logo} 
              />

              {/* Name, Ticker, Runes */}
              <div className="space-y-5">
                <div>
                  <label htmlFor="tokenName" className="block text-sm font-semibold text-n-1/90 mb-2 uppercase tracking-wider">
                    Token Name *
                  </label>
                  <Input
                    id="tokenName"
                    name="tokenName"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Astro Token"
                    className="w-full"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="tokenSymbol" className="block text-sm font-semibold text-n-1/90 mb-2 uppercase tracking-wider">
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
                    className="w-full"
                    required
                  />
                </div>

                {selectedBaseToken === "BITCOIN" && (
                  <div>
                    <label htmlFor="runesTicker" className="block text-sm font-semibold text-n-1/90 mb-2 uppercase tracking-wider">
                      Runes Ticker
                    </label>
                    <Input 
                      id="runesTicker" 
                      name="runesTicker" 
                      type="text" 
                      value={runesTickerValue} 
                      readOnly 
                      className="w-full bg-n-8 text-n-3 cursor-not-allowed"
                    />
                    <p className="text-xs text-n-4 mt-1">Auto-generated Runes ticker format</p>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="mt-6">
              <label htmlFor="description" className="block text-sm font-semibold text-n-1/90 mb-2 uppercase tracking-wider">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 border border-n-6 rounded-xl text-n-1 bg-n-8 focus:outline-none focus:ring-2 focus:ring-color-1/50 focus:border-color-1 transition-all duration-200 resize-none"
                rows="5"
                placeholder="Describe your token's purpose, utility, and vision..."
                required
                maxLength={500}
              ></textarea>
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-n-4">Make it compelling and clear</p>
                <p className={`text-sm font-medium ${description.length > 450 ? 'text-orange-400' : 'text-n-4'}`}>
                  {description.length}/500
                </p>
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="bg-n-7 border border-n-6 rounded-2xl p-6 lg:p-8">
            <h2 className="text-xl font-bold text-n-1 mb-6">Social Links (Optional)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-n-1/90 mb-2 uppercase tracking-wider">
                  Website
                </label>
                <Input 
                  placeholder="https://example.com" 
                  value={website} 
                  onChange={(e) => setWebsite(e.target.value)}
                  type="url"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-n-1/90 mb-2 uppercase tracking-wider">
                  Telegram
                </label>
                <Input 
                  placeholder="https://t.me/channel" 
                  value={telegram} 
                  onChange={(e) => setTelegram(e.target.value)}
                  type="url"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-n-1/90 mb-2 uppercase tracking-wider">
                  Twitter
                </label>
                <Input 
                  placeholder="https://twitter.com/handle" 
                  value={twitter} 
                  onChange={(e) => setTwitter(e.target.value)}
                  type="url"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Pricing Info */}
          <div className={`border-2 rounded-2xl p-6 lg:p-8 ${selectedChain.borderColor} ${selectedChain.bgColor}`}>
            <h2 className="text-xl font-bold text-n-1 mb-4">Launch Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-n-8/50 rounded-xl border border-n-6">
                <p className="text-sm text-n-4 mb-1 uppercase tracking-wider">Initial Supply</p>
                <p className="text-2xl font-bold text-n-1">50%</p>
                <p className="text-xs text-n-4 mt-1">To creator wallet</p>
              </div>
              <div className="text-center p-4 bg-n-8/50 rounded-xl border border-n-6">
                <p className="text-sm text-n-4 mb-1 uppercase tracking-wider">Launch Fee</p>
                <p className={`text-2xl font-bold ${selectedChain.textColor}`}>
                  0.01 {selectedBaseToken === "BITCOIN" ? "BTC" : "ETH"}
                </p>
                <p className="text-xs text-n-4 mt-1">Platform fee</p>
              </div>
              <div className="text-center p-4 bg-n-8/50 rounded-xl border border-n-6">
                <p className="text-sm text-n-4 mb-1 uppercase tracking-wider">Total Payment</p>
                <p className={`text-2xl font-bold ${selectedChain.textColor}`}>
                  1.01 {selectedBaseToken === "BITCOIN" ? "BTC" : "ETH"}
                </p>
                <p className="text-xs text-n-4 mt-1">Inc. supply + fee</p>
              </div>
            </div>
          </div>

          {/* Discount Code */}
          <div className="bg-n-7 border border-n-6 rounded-2xl p-6 lg:p-8">
            <label htmlFor="discountCode" className="block text-sm font-semibold text-n-1/90 mb-2 uppercase tracking-wider">
              Discount Code
            </label>
            <Input 
              id="discountCode" 
              name="discountCode" 
              type="text" 
              placeholder="Enter code for free token creation"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-n-4 mt-2">Have a code? Create your token for free!</p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="bg-red-500/10 border-2 border-red-500/30 rounded-xl p-4 flex items-start space-x-3">
              <FiAlertCircle className="text-red-400 text-xl flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium">Error</p>
                <p className="text-red-300/80 text-sm">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="bg-green-500/10 border-2 border-green-500/30 rounded-xl p-4 flex items-start space-x-3">
              <FiCheckCircle className="text-green-400 text-xl flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-400 font-medium">Success!</p>
                <p className="text-green-300/80 text-sm">{successMsg}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full text-lg py-4 relative overflow-hidden group" 
            disabled={loading || !name || !ticker || !description}
          >
            <span className="relative z-10 flex items-center justify-center">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Creating Token...
                </>
              ) : (
                "Create Token"
              )}
            </span>
          </Button>

          {/* Create to Earn Section */}
          <div className="relative overflow-hidden border-2 border-color-1/30 bg-gradient-to-br from-color-1/10 via-n-7 to-color-2/10 rounded-2xl p-8 text-center">
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
              <div className="absolute top-4 right-4 w-32 h-32 bg-color-1 rounded-full blur-3xl"></div>
              <div className="absolute bottom-4 left-4 w-32 h-32 bg-color-2 rounded-full blur-3xl"></div>
            </div>
            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-n-1 mb-3 flex items-center justify-center">
                <span className="mr-2">🎉</span>
                Create to Earn
              </h2>
              <p className="text-n-2 text-lg">
                Earn <span className={`font-bold ${selectedChain.textColor}`}>0.001 {selectedBaseToken === "BITCOIN" ? "BTC" : "ETH"}</span> when your token successfully bonds to the AMM!
              </p>
              <p className="text-n-4 text-sm mt-2">
                Create great tokens and get rewarded
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePage;