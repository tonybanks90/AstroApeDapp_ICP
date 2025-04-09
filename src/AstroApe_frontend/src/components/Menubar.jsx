import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FaHome, FaChartLine, FaWallet, FaPlusCircle, FaUser } from "react-icons/fa";

const MenuBar = () => {
    const location = useLocation();

    const menuItems = [
        { name: "Tokens", icon: <FaHome />, path: "/Token/1" },
        { name: "Liquidity", icon: <FaChartLine />, path: "/liquidity" },
        { name: "Create", icon: <FaPlusCircle />, path: "/Token/2" },
        { name: "Wallet", icon: <FaWallet />, path: "/Token/8" },
        { name: "Profile", icon: <FaUser />, path: "/Token/3" },
    ];

    return (
        <div className="fixed bottom-0 left-0 w-full bg-n-8 border-t border-n-6 p-2 flex justify-around items-center lg:hidden">
            {menuItems.map((item) => (
                <Link key={item.name} to={item.path} className={`flex flex-col items-center text-sm p-2 ${location.pathname === item.path ? "text-color-1" : "text-n-1/50"}`}>
                    {item.icon}
                    <span>{item.name}</span>
                </Link>
            ))}
        </div>
    );
};

export default MenuBar;
