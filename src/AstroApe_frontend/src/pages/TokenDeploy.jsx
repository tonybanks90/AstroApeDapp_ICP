import React from "react";
import DAppHeader from "../components/DAppHeader";
import ButtonGradient from "../assets/svg/ButtonGradient";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";

const TokenDeploy = () => {
    return (
        <>
            <div className='flex flex-col lg:flex-row h-screen'>
                <DAppHeader />
                <Sidebar />
                <div className="flex-grow p-2 lg:ml-0 lg:flex lg:flex-col">
                    <Outlet />
                </div>
            </div>
            <ButtonGradient />
        </>
    );
}

export default TokenDeploy;
