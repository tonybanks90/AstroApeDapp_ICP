import React, { useState } from "react";
import Button from "./Button";
import Input from "./Input";

// Image Upload Component
const ImageUpload = ({ label, id, onImageChange, imageSrc, className = "" }) => {
  return (
    <div className={`flex flex-col ${className}`}>
      <label className="block text-lg font-medium text-n-1 mb-2" htmlFor={id}>
        {label}
      </label>
      <div className="relative w-full h-32 border border-n-6 bg-n-8 rounded-md flex items-center justify-center overflow-hidden">
        {imageSrc ? (
          <img src={imageSrc} alt="Uploaded" className="object-cover h-full w-full" />
        ) : (
          <span className="text-n-1/50">Upload {label}</span>
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
  const [banner, setBanner] = useState(null);

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

  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBanner(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="pt-16 lg:pt-20 p-6 lg:p-8">
      {/* Page Header */}
      <h1 className="text-3xl font-bold mb-8 text-n-1">Create Your Token</h1>

      {/* Form */}
      <form className="space-y-6">
        {/* Bento Box Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side - Logo */}
          <ImageUpload
            label="Logo"
            id="logo"
            onImageChange={handleLogoChange}
            imageSrc={logo}
            className="lg:col-span-1"
          />

          {/* Right Side - Token Name & Ticker Symbol */}
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

        {/* Description */}
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

        {/* Banner */}
        <ImageUpload
          label="Banner"
          id="banner"
          onImageChange={handleBannerChange}
          imageSrc={banner}
        />

        {/* Deploy To */}
        <div>
          <label htmlFor="deployTo" className="block text-lg font-medium text-n-1 mb-2">
            Deploy to
          </label>
          <select
            id="deployTo"
            name="deployTo"
            className="w-full px-4 py-2 border border-n-6 rounded-md text-n-1 bg-n-8 focus:outline-none focus:ring-2 focus:ring-color-1 transition duration-150 ease-in-out"
            required
          >
            <option value="">Select Network</option>
            <option value="ETH">Ethereum</option>
            <option value="ICP">ICP</option>
            {/* Add more options as needed */}
          </select>
        </div>

        {/* Social Media Links */}
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

        {/* Submit Button */}
        <Button type="submit" className="w-full">
          Create Token
        </Button>
      </form>
    </div>
  );
};

export default CreatePage;
