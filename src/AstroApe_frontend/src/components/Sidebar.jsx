import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { disablePageScroll, enablePageScroll } from "scroll-lock";
import { navigation } from "../constants/index";
import Button from "./Button";
import MenuSvg from '../assets/svg/MenuSvg';
import ConnectWallet from "./ConnectWallet";
import Socials from "./Socials";
import QuickBuy from "./QuickBuy";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import LoginButton from "./login-button";
import identity from "./identity";
import Astroapplogo2 from "../assets/Astroapplogo2.png";
import { Astrofun } from "../assets"; // Adjust extension if needed
import { FaHome, FaChartLine, FaWallet, FaPlusCircle, FaUser } from "react-icons/fa";
import { GradientLight } from "../design/Benefits";


const Sidebar = () => {
  const pathname = useLocation().pathname;
  const [openNavigation, setOpenNavigation] = useState(false);
  const [showConnectWallet, setShowConnectWallet] = useState(false);
  const [showAddressCard, setShowAddressCard] = useState(false);

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
    setShowConnectWallet(!showConnectWallet);
  };

  const toggleAddressCard = () => {
    setShowAddressCard(!showAddressCard);
  };

  const formatAddress = (address) => {
    if (address.length > 12) {
      return `${address.slice(0, 4)}.....${address.slice(-4)}`;
    }
    return address;
  };

  return (
    <div className="flex relative">
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen bg-n-8 z-50 transform ${
          openNavigation ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:w-64 lg:flex lg:flex-col lg:items-center
          border-r border-n-6 overflow-y-auto hidden 
        `}
      >
        <div className="flex flex-col items-center py-6 h-full">
          {/* AstroApe Logo */}
          <Link to="/" className="block">
            <img
              src={Astrofun}
              alt="AstroApe Logo"
              className="h-24 md:h-32 lg:h-24"
            />
          </Link>

          {/* Navigation */}
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
                {item.icon}
                {item.title}
                
              </Link>
            ))}
          </nav>

          {/* Bottom Controls */}
          <div className="mt-auto flex flex-col items-center pb-6">
            <div className="flex flex-col items-center space-y-4">
              <ConnectButton />
              <LoginButton />
            </div>
            <Socials className="hidden relative z-10 mt-4 lg:block" />
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="lg:ml-64 w-full p-4">
        {showConnectWallet && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <ConnectWallet className="mb-2" />
              <LoginButton />
              <identity />
              <Button onClick={toggleConnectWallet} className="mt-4">Close</Button>
            </div>
          </div>
        )}
      </div>

      {/* Toggle Button for mobile */}
      <div className="ml-auto p-4 lg:hidden">
        <Button onClick={toggleNavigation}>
          <MenuSvg openNavigation={openNavigation} />
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
