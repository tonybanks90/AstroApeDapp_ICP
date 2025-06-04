import React from "react";
import { useLocation } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Socials from "./Socials";
import Astroapplogo2 from "../assets/Astroapplogo2.png"; // ✅ Import the logo

const Header = () => {
  const pathname = useLocation().pathname;

  return (
    <div className="fixed top-0 left-0 w-full z-50 border-b border-n-6 bg-n-8/90 backdrop-blur-sm">
      <div className="flex items-center justify-between px-5 lg:px-7.5 xl:px-10 max-lg:py-4">
        {/* ✅ Replace text with logo */}
        <a href="#hero" className="block">
          <img
            src={Astroapplogo2}
            alt="AstroApe Logo"
            className="h-12 md:h-16 lg:h-14" // adjust size as needed
          />
        </a>

        {/* ConnectWallet only on small screens */}
        <div className="lg:hidden">
          <ConnectButton />
        </div>
      </div>
    </div>
  );
};

export default Header;
