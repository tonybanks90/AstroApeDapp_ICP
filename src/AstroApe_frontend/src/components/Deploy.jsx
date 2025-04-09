import React, { useState } from "react";
import { FiUpload } from "react-icons/fi";
import toast from "react-hot-toast";
import Button from "./Button";
import Input from "./Input";

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
  const [selectedChain, setSelectedChain] = useState("ETH");

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

  const handleChainClick = (chain) => {
    if (chain === "Base" || chain === "Solana" || chain === "Sui") {
      toast("Coming Soon", { position: "top-right" });
    } else {
      setSelectedChain(chain);
    }
  };

  return (
    <div className="pt-16 lg:pt-20 p-6 lg:px-36">
      <h1 className="text-3xl font-bold mb-8 text-n-1">Create Your Token</h1>

      <form className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ImageUpload label="Logo" id="logo" onImageChange={handleLogoChange} imageSrc={logo} />

          <div className="flex flex-col space-y-6">
            <div>
              <label htmlFor="tokenName" className="block text-lg font-medium text-n-1 mb-2">
                Token Name
              </label>
              <Input id="tokenName" name="tokenName" type="text" required />
            </div>
            <div>
              <label htmlFor="tokenSymbol" className="block text-lg font-medium text-n-1 mb-2">
                Ticker Symbol
              </label>
              <Input id="tokenSymbol" name="tokenSymbol" type="text" required />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-lg font-medium text-n-1 mb-2">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            className="w-full px-4 py-2 border border-n-6 rounded-md text-n-1 bg-n-8 focus:outline-none focus:ring-2 focus:ring-color-1 transition duration-150 ease-in-out"
            rows="4"
            required
          ></textarea>
        </div>

        <div>
          <label className="block text-lg font-medium text-n-1 mb-2">Select Chain</label>
          <div className="flex space-x-4">
            {[
              { name: "Ethereum", key: "ETH" },
              { name: "Base", key: "Base" },
              { name: "Solana", key: "Solana" },
              { name: "Sui", key: "Sui" },
            ].map((chain) => (
              <button
                key={chain.key}
                type="button"
                className={`px-4 py-2 border rounded-md ${
                  selectedChain === chain.key ? "bg-color-1 text-white" : "bg-n-8 text-n-1"
                }`}
                onClick={() => handleChainClick(chain.key)}
              >
                {chain.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="snipeAmount" className="block text-lg font-medium text-n-1 mb-2">
            Snipe Amount ({selectedChain === "ETH" ? "ETH" : "ICP"})
          </label>
          <Input
            id="snipeAmount"
            name="snipeAmount"
            type="number"
            placeholder={`Enter Snipe Amount in ${selectedChain === "ETH" ? "ETH" : "ICP"}`}
            required
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <label htmlFor="website" className="block text-lg font-medium text-n-1 mb-2">
              Website
            </label>
            <Input id="website" name="website" type="url" placeholder="https://yourwebsite.com" />
          </div>
          <div>
            <label htmlFor="telegram" className="block text-lg font-medium text-n-1 mb-2">
              Telegram
            </label>
            <Input id="telegram" name="telegram" type="url" placeholder="https://t.me/yourtelegram" />
          </div>
          <div>
            <label htmlFor="twitter" className="block text-lg font-medium text-n-1 mb-2">
              Twitter
            </label>
            <Input id="twitter" name="twitter" type="url" placeholder="https://twitter.com/yourtwitter" />
          </div>
        </div>

        <Button type="submit" className="w-full">Create Token</Button>
      </form>
    </div>
  );
};

export default CreatePage;
