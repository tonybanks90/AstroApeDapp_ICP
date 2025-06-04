import Section from "./Section";
import { curve, ApeApp, ApeAppM } from "../assets";
import Button from "./Button";
import { heroBackground } from "../assets";
import { BackgroundCircles, BottomLine, Gradient } from "../design/Hero";
import { useRef } from "react";
import SocialSection from "./SocialSection";
import { Astroapplogo3 } from "../assets";
import { Darkastro } from "../assets";
import { GradientLight } from "../design/Benefits";
import { p } from "../../dist/assets/hooks.module-b6a718b4";

const Hero = () => {
    const parallaxRef = useRef(null);

    return (
        <Section
            className="pt-[12rem] -mt-[5.25rem]"
            crosses
            crossesOffset="lg:translate-y-[5.25]"
            customPaddings
        >
            <div className="container relative" ref={parallaxRef}>
                <div className="relative z-1 max-w-[62rem] mx-auto text-center mb-[4rem] md:mb-20 lg:mb-[6rem]">
                    <h1 className="h1 mb-6">
                        Launch Cross-Chain Memecoins on{" "}
                        <span className="inline-block relative">
                            AstroApe{" "}
                            <img
                                src={curve}
                                className="absolute top-full left z-0 w-full xl:-mt-2"
                                width={624}
                                height={28}
                                alt="curve"
                            />
                        </span>
                      
                    </h1>
                    <p className="body-1 max-w-3xl mx-auto mb-6 text-n-2 lg:mb-8">
                        Unleash the power of Chain Fusion On Internet Computer Protocol
                    </p>
                    

                    <Button white>Coming Soon</Button>
                </div>

                {/* Styled image section like the original card layout */}
                <div className="relative max-w-[23rem] mx-auto md:max-w-5xl xl:mb-24">
                    <div className="relative z-1 p-0.5 rounded-2xl bg-conic-gradient">
                        <div className="relative bg-n-8 rounded-[1rem] overflow-hidden">
                            <div className="h-[1.4rem] bg-n-10 rounded-t-[0.9rem]" />
                            
                            {/* Mobile image */}
                            <img
                                src={ApeAppM}
                                alt="AstroApe App Preview Mobile"
                                className="w-full rounded-b-[0.9rem] block md:hidden"
                            />

                            {/* Desktop image */}
                            <img
                                src={ApeApp}
                                alt="AstroApe App Preview Desktop"
                                className="w-full rounded-b-[0.9rem] hidden md:block"
                            />
                        </div>
                    </div>

                    <div className="absolute -top-[54%] left-1/2 w-[234%] -translate-x-1/2 md:-top-[46%] md:w-[138%] lg:-top-[104%]">
                        <img
                            src={Darkastro}
                            className="w-full"
                            width={1440}
                            height={1800}
                            alt="hero"
                        />
                    </div>

                    <BackgroundCircles />
                </div>

                <SocialSection className="relative z-10 mt-20 lg:block" />
            </div>
            <BottomLine />
        </Section>
    );
};

export default Hero;
