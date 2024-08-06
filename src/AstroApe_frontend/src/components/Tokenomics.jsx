import Section from "./Section";
import { check } from "../assets";
import { collabContent, collabText } from "../constants";
import Button from "./Button";
import { LeftCurve, RightCurve } from "../design/Collaboration";

const Tokenomics = () => {
  return (
    <Section crosses>
        <div className="container lg:flex">
            <div className="max-w-[25rem]">
                <h2 className="h1 mb-4 md:mb-8">
                    Tokenomics
                </h2>

                <ul className="max-w-[22rem] mb-10 md:mb-14">
                    {collabContent.map((item) => (
                        <li className="mb-3 py-3 key={item.id}">
                            <div className="flex items-center">
                                <img src={check} width={24} height={24} alt="check"/>
                                <h6 className="body-2 ml-5">{item.title}</h6>
                                
                            </div>
                            {item.text && (
                                    <p className="body-2 mt-3 text-n-4">
                                        {item.text}
                                    </p>
                                )}
                        </li>
                    ))}
                </ul>

                <Button>Learn More</Button>
            </div>

            <div className="lg:ml-auto xl:w-[38rem] mt-4">
                <p className="body-2 mb-4 text-n-4 md:mb-16
                lg:mb-32 lg:w-[22rem] lg:mx-auto">
                    {collabText}
                </p>

                <div className="relative left-1/2 flex w-[22rem]
                aspect-square border border-n-6
                rounded-full -translate-x-1/2 scale:75
                md:scale-100">

                    <LeftCurve />
                    <RightCurve />

                </div>
            </div>
        </div>
    </Section>
  )
}

export default Tokenomics