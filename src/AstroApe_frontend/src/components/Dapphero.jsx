import React, { useState } from "react";
import Astroapplogo3 from "../assets/Astroapplogo3.png";
import Button from "./Button";
import Guide from "./Guide";
import { Link } from "react-router-dom";
import { btcicon, ethicon, solicon, baseicon, suiicon } from "../assets";

const Dapphero = () => {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <section className="relative bg-n-9 text-white overflow-hidden mb-6 min-h-[20vh] sm:min-h-[25vh] lg:min-h-[30vh] ">
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#1f1f1f_1px,transparent_1px)] [background-size:20px_20px] opacity-10 z-0" />

      {/* Guide Pop-up */}
      {showGuide && <Guide onClose={() => setShowGuide(false)} />}

      {/* Content */}
      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between max-w-7xl mx-auto px-6 py-3 sm:py-4 lg:py-6 gap-4 md:gap-6">
        {/* Left: Text & Buttons */}
        <div className="text-center lg:text-left max-w-xl">
          <div className="bg-color-1 text-black px-3 py-1 rounded-full inline-block mb-2 font-bold text-xs tracking-wide">
            TESTNET
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight">
            <span className="text-white">Fair memes</span>{" "}
            <span className="text-color-1">for fair fun</span>
          </h1>

          <div className="mt-4 flex flex-row justify-center lg:justify-start gap-3">
            <Button
              variant="outline"
              className="border-purple-700 text-purple-700 hover:bg-purple-700 hover:text-black transition font-bold text-sm px-3 py-1"
              onClick={() => setShowGuide(true)}
            >
              How it works
            </Button>
            <Link to="/Token/2">
              <Button className="bg-color-1 text-black font-bold hover:bg-purple-700 text-sm px-3 py-1">
                Launch Token
              </Button>
            </Link>
          </div>
        </div>

        {/* Icons in center (only on large screens) */}
        <div className="hidden lg:flex gap-4 items-center justify-center">
          {[btcicon, ethicon, solicon, baseicon, suiicon].map((icon, index) => (
            <img key={index} src={icon} alt="chain icon" className="w-24 h-24" />
          ))}
        </div>

        {/* Right: Astroape Logo (only on large screens) */}
        <div className="hidden lg:block flex-shrink-0 max-h-[140px]">
          <img
            src={Astroapplogo3}
            alt="AstroApe Logo"
            className="w-40 object-contain max-h-full"
          />
        </div>
      </div>

      {/* Icons on small screens (above wave) */}
      <div className="lg:hidden flex justify-center gap-4 relative z-10 mb-3">
        {[btcicon, ethicon, solicon, baseicon, suiicon].map((icon, index) => (
          <img key={index} src={icon} alt="chain icon" className="w-14 h-14" />
        ))}
      </div>

      {/* Bottom wave border */}
      <div className="absolute bottom-0 w-full z-0">
        <svg
          className="w-full h-6"
          viewBox="0 0 1440 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <path
            fill="#ffffff"
            d="M0,30 C360,90 1080,-30 1440,30 L1440,100 L0,100 Z"
          />
        </svg>
      </div>
    </section>
  );
};

export default Dapphero;