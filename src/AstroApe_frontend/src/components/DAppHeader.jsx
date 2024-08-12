import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { disablePageScroll, enablePageScroll } from "scroll-lock";
import { ApeLogo, AstroLogo } from "../assets";
import { navigation } from "../constants/index";
import Button from "./Button";
import MenuSvg from '../assets/svg/MenuSvg';
import { useAuth } from "../auth/AuthContext"; // Import useAuth for wallet address and logout
import ConnectWallet from "./ConnectWallet"; // Import ConnectWallet component
import Socials from "./Socials"; // Import SocialSection

const Header = () => {
  const pathname = useLocation().pathname;
  const [openNavigation, setOpenNavigation] = useState(false);
  const [showConnectWallet, setShowConnectWallet] = useState(false); // State to show/hide ConnectWallet
  const [showAddressCard, setShowAddressCard] = useState(false); // State to show/hide address card

  const { walletAddress, logout } = useAuth(); // Get walletAddress and logout from useAuth

  const toggleNavigation = () => {
    if (openNavigation) {
      setOpenNavigation(false);
      enablePageScroll();
    } else {
      setOpenNavigation(true);
      disablePageScroll();
    }
  };

  const handleClick = () => {
    if (!openNavigation) return;

    enablePageScroll();
    setOpenNavigation(false);
  };

  const toggleConnectWallet = () => {
    setShowConnectWallet(!showConnectWallet); // Toggle the ConnectWallet card
  };

  const toggleAddressCard = () => {
    setShowAddressCard(!showAddressCard); // Toggle the address card
  };

  const formatAddress = (address) => {
    if (address.length > 12) {
      return `${address.slice(0, 4)}.....${address.slice(-4)}`;
    }
    return address;
  };

  return (
    <div
      className={`fixed top-0 left-0 w-full z-50  border-b border-n-6 lg:bg-n-8/90 lg:backdrop-blur-sm ${
        openNavigation ? "bg-n-8" : "bg-n-8/90 backdrop-blur-sm"
      }`}
    >
      <div className="flex items-center px-5 lg:px-7.5 xl:px-10 max-lg:py-4">
        <a
          className="block text-2xl font-bold text-n-1 relative pb-2 before:content-[''] before:absolute before:left-0 before:bottom-0 before:w-full before:h-[2px] before:bg-n-1 before:translate-y-1 after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px] after:bg-n-1"
          href="#hero"
        >
          ASTROAPE
        </a>

        {/* Toggle Button for small screens */}
        <Button
          className="ml-auto lg:hidden"
          px="px-3"
          onClick={toggleNavigation}
        >
          <MenuSvg openNavigation={openNavigation} />
        </Button>
      </div>

      {/* Navigation Menu (Visible on Small Screens) */}
      <nav
        className={`${
          openNavigation ? "flex" : "hidden"
        } fixed top-[5rem] left-0 right-0 bottom-0 bg-n-8 lg:hidden z-40`}
      >
        <div className="relative z-2 flex flex-col items-center justify-center m-auto">
          {navigation.map((item) => (
            <Link
              key={item.id}
              to={item.url}
              onClick={handleClick}
              className={`block relative font-code text-2xl uppercase text-n-1 transition-colors hover:text-color-1 px-6 py-6`}
            >
              {item.title}
            </Link>
          ))}
          
          {walletAddress ? (
            <>
              <Button onClick={toggleAddressCard} className="mb-4">
                {formatAddress(walletAddress)}
              </Button>
              {showAddressCard && (
                <div className="bg-n-8 border border-n-6 rounded-lg p-4 shadow-lg mt-4">
                  <p className="text-lg font-semibold text-n-1">Wallet Address</p>
                  <p className="text-base text-n-2">{walletAddress}</p>
                  <Button onClick={logout} className="mt-4">
                    Logout
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Button onClick={toggleConnectWallet}>Connect</Button>
          )}

          {/* Add SocialSection below the connect button */}
          <Socials className="relative z-10 mt-4"/>
        </div>
      </nav>

      {/* Render the ConnectWallet card when showConnectWallet is true */}
      {showConnectWallet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <ConnectWallet />
            <Button onClick={toggleConnectWallet} className="mt-4">Close</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Header;
