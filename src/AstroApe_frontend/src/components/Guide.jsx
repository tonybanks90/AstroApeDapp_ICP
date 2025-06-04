import React from "react";
import { FaTimes, FaRocket, FaWallet, FaPlusCircle, FaDollarSign, FaChartLine, FaLink, FaPeopleArrows } from "react-icons/fa";
import  Button  from "./Button"; // Replace with your actual import

const steps = [
  { icon: <FaWallet />, title: "Connect Wallet", description: "Choose Ethereum or ICP to get started." },
  { icon: <FaRocket />, title: "Launch Token", description: "Use our deployer to create your memecoin instantly." },
  { icon: <FaPlusCircle />, title: "Set Supply", description: "Define total supply & name your token." },
  { icon: <FaDollarSign />, title: "Bonding Curve", description: "Your token launches with dynamic pricing & no liquidity needed." },
  { icon: <FaChartLine />, title: "Track Progress", description: "Follow your token's growth via the live chart." },
  { icon: <FaLink />, title: "Share & Shill", description: "Get your referral link and spread the word." },
  { icon: <FaPeopleArrows />, title: "Earn Commissions", description: "Earn 1% from every referred trade." },
];

export default function Guide({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="relative bg-[#111] border border-[#333] rounded-2xl shadow-lg p-6 max-w-2xl w-full text-white">
        {/* Close Button */}
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl"
          onClick={onClose}
        >
          <FaTimes />
        </button>

        {/* Header */}
        <h2 className="text-2xl font-bold text-center mb-6 text-white/90">🚀 How to Use AstroApe</h2>

        {/* Steps */}
        <div className="grid gap-4 sm:grid-cols-2">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-4 bg-[#1a1a1a] p-4 rounded-xl border border-[#222] hover:border-white/20 transition">
              <div className="text-xl text-color-1">{step.icon}</div>
              <div>
                <h4 className="text-md font-semibold text-white/90">{step.title}</h4>
                <p className="text-sm text-gray-400">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Button */}
        <div className="mt-6 text-center">
          <Button onClick={onClose} className="bg-color-1 text-black hover:brightness-110">
            Got it!
          </Button>
        </div>
      </div>
    </div>
  );
}
