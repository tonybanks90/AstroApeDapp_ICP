import Header from "../components/Header";
import ButtonGradient from "../assets/svg/ButtonGradient";
import AppHeader from "../components/AppHeader";
import Sidebar from "../components/Sidebar";
import Deploy from "../components/Deploy";

import Profile from "../components/Profile";
import { Outlet } from "react-router-dom";


const TokenDeploy = () => {
    return (
        <>
        <div className='flex h-screen'>
        <Header/>
        <Sidebar />
            
            <div className="flex-grow p-4">
            
            < Outlet />

            </div>
            
            

          
            
        </div>


         <ButtonGradient />
        </>
    )
}

export default TokenDeploy
