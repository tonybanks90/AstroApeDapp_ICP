import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import LoginButton from "./login-button";

import Astroapplogo2 from "../assets/Astroapplogo2.png";
import Button from "./Button";

const Header = () => {
  const pathname = useLocation().pathname;
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="fixed top-0 left-0 w-full z-50 border-b border-n-6 bg-n-8/90 backdrop-blur-sm">
      <div className="flex items-center justify-between px-5 lg:px-7.5 xl:px-10 max-lg:py-4">
        {/* ✅ Logo */}
        <Link to="/Token/9" className="block">
          <img
            src={Astroapplogo2}
            alt="AstroApe Logo"
            className="h-12 md:h-16 lg:h-14"
          />
        </Link>

        {/* ✅ Wallet + Login Controls */}
        <div className="flex items-center space-x-3">
          <ConnectButton />
          <LoginButton />
          {/* If you want to trigger a modal */}
          
        </div>
      </div>

      {/* ✅ Auth Modal (optional, triggered by Identity button) */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg p-6 shadow-lg w-[90%] max-w-md">
            <h3 className="text-lg font-semibold mb-3">Authentication</h3>
            <ConnectButton />
            <LoginButton />
            <identity />
            <Button
              onClick={() => setShowAuthModal(false)}
              className="mt-4 w-full"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Header;
