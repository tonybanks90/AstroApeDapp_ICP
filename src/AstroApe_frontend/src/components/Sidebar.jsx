import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { disablePageScroll, enablePageScroll } from "scroll-lock";
import { navigation } from "../constants/index";
import Button from "./Button";
import MenuSvg from '../assets/svg/MenuSvg';
import ConnectWallet from "./ConnectWallet"; // Import ConnectWallet component
import { useAuth } from "../auth/AuthContext"; // Import useAuth for wallet address and logout

const Sidebar = () => {
  const pathname = useLocation().pathname; // Get current pathname from useLocation
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
    <div className="flex relative">
      {/* Sidebar - hidden on small screens */}
      <div
        className={`fixed left-0 top-0 h-screen bg-n-8 z-50 transform ${
          openNavigation ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:w-64 lg:flex lg:flex-col lg:items-center
          border-r border-n-6 overflow-y-auto hidden 
        `}
      >
        <div className="flex flex-col items-center py-6 h-full">
          <a
            className="block text-2xl font-bold text-n-1 relative pb-2 before:content-[''] before:absolute before:left-0 before:bottom-0 before:w-full before:h-[2px] before:bg-n-1 before:translate-y-1 after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px] after:bg-n-1"
            href="#hero"
          >
            ASTROAPE
          </a>

          <nav className="mt-5 flex flex-col items-center flex-grow">
            {navigation.map((item) => (
              <Link
                key={item.id}
                to={item.url}
                onClick={handleClick}
                className={`block relative font-code text-1xl uppercase transition-colors hover:text-color-1 px-6 py-4 ${
                  item.url === pathname ? "text-color-1" : "text-n-1/50"
                }`}
              >
                {item.title}
              </Link>
            ))}
          </nav>

          <div className="mt-auto flex flex-col items-center pb-6">
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
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="lg:ml-64 w-full p-4">
        {/* Your main content goes here */}

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

      {/* Toggle Button for small screens */}
      <div className="ml-auto p-4 lg:hidden">
        <Button onClick={toggleNavigation}>
          <MenuSvg openNavigation={openNavigation} />
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
