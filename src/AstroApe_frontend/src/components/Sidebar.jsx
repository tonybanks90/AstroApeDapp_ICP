import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { disablePageScroll, enablePageScroll } from "scroll-lock";
import { navigation } from "../constants/index";
import Button from "./Button";
import MenuSvg from "../assets/svg/MenuSvg";
import ConnectWallet from "./ConnectWallet";
import Socials from "./Socials";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import LoginButton from "./login-button";
import identity from "./identity";
import { Astrofun } from "../assets"; 
import { FaHome, FaChartLine, FaWallet, FaPlusCircle, FaUser } from "react-icons/fa";

const Sidebar = () => {
  const pathname = useLocation().pathname;
  const [openNavigation, setOpenNavigation] = useState(false);
  const [showConnectWallet, setShowConnectWallet] = useState(false);

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

  return (
    <div className="flex relative">
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen bg-n-8 z-50 transform ${
          openNavigation ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:w-64 lg:flex lg:flex-col
          border-r border-n-6 overflow-y-auto hidden 
        `}
      >
        <div className="flex flex-col h-full w-full">
          {/* AstroApe Logo */}
          <div className="flex justify-center py-2">
            <Link to="/Token/9" className="block">
              <img
                src={Astrofun}
                alt="AstroApe Logo"
                className="h-24 md:h-32 lg:h-24"
              />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="mt-2 flex flex-col flex-grow">
            {navigation.map((item) => (
              <Link
                key={item.id}
                to={item.url}
                onClick={handleClick}
                className={`flex items-center px-8 py-3 text-base font-medium uppercase transition-colors hover:text-color-1 ${
                  item.url === pathname ? "text-color-1" : "text-n-1/50"
                }`}
              >
                <item.icon className="text-xl mr-3" />
                {item.title}
              </Link>
            ))}
          </nav>

          {/* Bottom Controls */}
          <div className="mt-auto flex flex-col items-center pb-6 w-full">
            {/* Wallet + Login */}
            {/*<div className="flex flex-col items-center space-y-4">
              <ConnectButton />
              <LoginButton />
            </div>*/}

            {/* Socials with stroke above */}
            <div className="w-full border-t border-n-6 mt-6 pt-4 flex flex-col items-center">
              <Socials className="relative z-10 mb-4" />

              {/* Powered by ICP */}
              <div className="rounded-full bg-orange-500 text-white text-xs px-4 py-1 mb-2">
                Powered by ICP
              </div>

              {/* Version */}
              <div className="text-orange-500 text-xs font-medium mb-1">
                Version 1.0.0
              </div>

              {/* Copyright */}
              <div className="text-n-3 text-[11px] text-center">
                ©2025 AstroApe <br /> All rights reserved
              </div>
            </div>
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
              <Button onClick={() => setShowConnectWallet(false)} className="mt-4">
                Close
              </Button>
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
