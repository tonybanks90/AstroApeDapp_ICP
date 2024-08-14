import ButtonGradient from '../assets/svg/ButtonGradient';
import Button from '../components/Button';
import Features from '../components/Features';
import Header from '../components/Header';
import Hero from '../components/Hero';
import Roadmap from '../components/Roadmap';
import Tokenomics from '../components/Tokenomics';
import Footer from '../components/Footer';
import { ParallaxProvider } from 'react-scroll-parallax';


const LandingPage = () => {
    return (
        <>
        <div className='pt-[4.75rem] lg:pt-[5.25rem] overflow-hidden'>
            <Header />
            <Hero />
            <Features />
            <Tokenomics />
            <ParallaxProvider>
                <Roadmap />
            </ParallaxProvider>
            
            <Footer />
        
        </div>


         <ButtonGradient />
        </>
    )
}

export default LandingPage
