import React from "react";
import { useLocation } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit"; // Import RainbowKit ConnectButton
import Socials from "./Socials";

const Header = () => {
  const pathname = useLocation().pathname;

  return (
    <div className="fixed top-0 left-0 w-full z-50 border-b border-n-6 bg-n-8/90 backdrop-blur-sm">
      <div className="flex items-center justify-between px-5 lg:px-7.5 xl:px-10 max-lg:py-4">
        <a
          className="block text-2xl font-bold text-n-1 relative pb-2 before:content-[''] before:absolute before:left-0 before:bottom-0 before:w-full before:h-[2px] before:bg-n-1 before:translate-y-1 after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px] after:bg-n-1"
          href="#hero"
        >
          ASTROAPE
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
