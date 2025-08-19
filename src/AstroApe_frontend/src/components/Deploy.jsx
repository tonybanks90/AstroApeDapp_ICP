import React, { useState } from "react";
import { FiUpload } from "react-icons/fi";
import Button from "./Button";
import Input from "./Input";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory, canisterId } from "../../../declarations/TokenFactory";

// 🎯 Setup agent + actor for TokenFactory
const agent = new HttpAgent();
if (process.env.DFX_NETWORK === "local") {
  agent.fetchRootKey();
}
const tokenFactory = Actor.createActor(idlFactory, { agent, canisterId });

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
        />
      </div>
    </div>
  );
};

const CreatePage = () => {
  const [logo, setLogo] = useState(null);
  const [selectedBaseToken, setSelectedBaseToken] = useState("BTC"); // default BTC
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [telegram, setTelegram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Random ID for runes ticker
  const randomId = "1234"; // TODO: replace with real generator
  const runesTickerValue =
    selectedBaseToken === "BTC"
      ? `${ticker ? ticker : "[short-ticker]"}.ID.${randomId}.ASTRO`
      : "";

  // 🎯 Handle token creation
  const handleCreateToken = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      // Convert logo into expected "LogoData"
      const logoData = logo
        ? { ImageUrl: logo } // if using URL/dataURI
        : { ImageUrl: "" };

      const result = await tokenFactory.createIcrc2Token(
        name,
        ticker,
        logoData,
        description,
        website ? [website] : [],
        telegram ? [telegram] : [],
        twitter ? [twitter] : []
      );

      if ("ok" in result) {
        setSuccessMsg(`✅ Token created! CanisterId: ${result.ok}`);
      } else {
        setErrorMsg(`❌ Error: ${result.err}`);
      }
    } catch (err) {
      console.error("Error creating token:", err);
      setErrorMsg(`❌ ${err.message || "Unexpected error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-16 lg:pt-20 p-6 mb-12 lg:px-36">
      <h1 className="text-3xl font-bold mb-8 text-n-1">Create Your Token</h1>

      <form className="space-y-6" onSubmit={handleCreateToken}>
        {/* Select Base Token */}
        <div>
          <label className="block text-lg font-medium text-n-1 mb-2">Select Base Token</label>
          <div className="flex space-x-4">
            {["BTC", "ETH", "SOL", "SUI"].map((token) => (
              <button
                key={token}
                type="button"
                className={`px-4 py-2 border rounded-md ${
                  selectedBaseToken === token ? "bg-color-1 text-white" : "bg-n-8 text-n-1"
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
                Token Name
              </label>
              <Input
                id="tokenName"
                name="tokenName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="tokenSymbol" className="block text-lg font-medium text-n-1 mb-2">
                Ticker Symbol
              </label>
              <Input
                id="tokenSymbol"
                name="tokenSymbol"
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                required
              />
            </div>

            {selectedBaseToken === "BTC" && (
              <div>
                <label htmlFor="runesTicker" className="block text-lg font-medium text-n-1 mb-2">
                  Runes Ticker
                </label>
                <Input id="runesTicker" name="runesTicker" type="text" value={runesTickerValue} readOnly />
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-lg font-medium text-n-1 mb-2">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border border-n-6 rounded-md text-n-1 bg-n-8 focus:outline-none focus:ring-2 focus:ring-color-1 transition duration-150 ease-in-out"
            rows="4"
            required
          ></textarea>
        </div>

        {/* Optional Links */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Input placeholder="Website" value={website} onChange={(e) => setWebsite(e.target.value)} />
          <Input placeholder="Telegram" value={telegram} onChange={(e) => setTelegram(e.target.value)} />
          <Input placeholder="Twitter" value={twitter} onChange={(e) => setTwitter(e.target.value)} />
        </div>

        {/* Supply / Fee / Payment Row */}
        <div className="flex flex-wrap gap-6 text-n-1">
          <span>Percent Supply: 50%</span>
          <span>Launch Fee: 0.01 {selectedBaseToken}</span>
          <span>Total Payment: 1.01 {selectedBaseToken}</span>
        </div>

        {/* Discount Code */}
        <div>
          <label htmlFor="discountCode" className="block text-lg font-medium text-n-1 mb-2">
            Enter a discount code to create a token for free
          </label>
          <Input id="discountCode" name="discountCode" type="text" placeholder="Enter discount code" />
        </div>

        {/* Error + Success Messages */}
        {errorMsg && <p className="text-red-500">{errorMsg}</p>}
        {successMsg && <p className="text-green-500">{successMsg}</p>}

        {/* Submit Button */}
        <Button type="submit" className="w-full z-40" disabled={loading}>
          {loading ? "Creating..." : "Create Token"}
        </Button>

        {/* Create to Earn Section */}
        <div className="mt-6 p-4 border border-n-6 bg-n-8 rounded-md text-center">
          <h2 className="text-lg font-bold text-n-1">Create to Earn</h2>
          <p className="text-n-1/80">
            Earn 0.001 when a token you create successfully bond to the AMM!
          </p>
        </div>
      </form>
    </div>
  );
};

export default CreatePage;
