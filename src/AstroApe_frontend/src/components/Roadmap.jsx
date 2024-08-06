import { smallSphere, stars } from "../assets";
import Heading from "./Heading";
import RoadmapList from "./RoadmapList";
import Section from "./Section";
import { LeftLine, RightLine } from '../design/Pricing';

const Roadmap = () => {
  return (
    <Section crosses className="overflow-hidden" id="">
        <div className="container relative z-2">
            <div className="hidden relative justify-center
            mb-[6.5rem] lg:flex">
                <img 
                 src={smallSphere} className="relative z-1" width={255}
                 height={255} alt="Sphere"
                />
                <div className="absolute top-1/2 left-1/2 w-[60rem]
                -translate-x-1/2 -traslate-y-1/2 pointer-events-none">
                    <img 
                     src={stars} className="w-full" width={950}
                     height={400} alt="Stars"
                    />
                </div>
            </div>
            
            <Heading 
            tag="Get started"
            title="Our Roadmap"/>

            <div className="relative">
                <RoadmapList />
                <LeftLine />
                <RightLine />

            </div>
        </div>
    </Section>
  )
}

export default Roadmap