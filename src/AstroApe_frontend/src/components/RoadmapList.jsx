import { pricing } from '../constants';


const RoadmapList = () => {
  return (
    <div className="flex gap-[1rem] max-lg:flex-wrap">
        {pricing.map((item) => (
            <div key={item.id} className="w-[19rem] 
            max-lg:w-full h-full px-6 bg-n-8 border border-n-6
            rounded-[2rem] lg:w-auto py-8">
                <h4 className="h4 mb-4">{item.title}</h4>

                <p>{item.description}</p>
            </div>
        ))}
    </div>
  )
}

export default RoadmapList
