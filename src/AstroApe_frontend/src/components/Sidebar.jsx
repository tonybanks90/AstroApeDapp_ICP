import { Link, useLocation } from "react-router-dom";
import { disablePageScroll, enablePageScroll } from "scroll-lock";
import { ApeLogo, AstroLogo } from "../assets";
import { navigation } from "../constants/index";
import Button from "./Button";
import MenuSvg from '../assets/svg/MenuSvg';
import { useState } from "react";

const Sidebar = () => {
  const pathname = useLocation();
  const [openNavigation, setOpenNavigation] = useState(false);

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
    <div className="flex">
      {/* Sidebar - hidden on small screens */}
      <div
        className={`fixed left-0 top-0 h-screen bg-n-8 z-50 transform ${
          openNavigation ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:w-64 lg:flex lg:flex-col lg:items-center
          border-r border-n-6 overflow-y-auto hidden lg:block
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
              <a
                key={item.id}
                href={item.url}
                onClick={handleClick}
                className={`block relative font-code text-1xl uppercase text-n-1 transition-colors hover:text-color-1 px-6 py-4 ${
                  item.url === pathname.hash ? "z-2 text-n-1" : "text-n-1/50"
                }`}
              >
                {item.title}
              </a>
            ))}
          </nav>

          <div className="mt-auto flex flex-col items-center pb-6">
            <a
              href="#signup"
              className="button text-n-1/50 transition-colors hover:text-n-1"
            >
              Buy Ape
            </a>
            <Button href="#login">Connect</Button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="lg:ml-64 w-full">
        {/* Your main content goes here */}
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
