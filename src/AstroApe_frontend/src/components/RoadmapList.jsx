import { roadmap } from "../constants";
import { motion } from "framer-motion";

const RoadmapList = () => {
  return (
    <div className="flex flex-wrap justify-center gap-8">
      {roadmap.map((item) => (
        <motion.div
          key={item.id}
          className="w-[20rem] p-6 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 border border-purple-700 rounded-2xl shadow-lg transform transition-transform duration-500 hover:scale-105"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <h4 className="text-white text-lg font-bold mb-4">{item.title}</h4>
          <p className="text-white mb-4">{item.description}</p>
          <ul className="text-white list-disc pl-4 space-y-2">
            {item.features.map((feature, index) => (
              <li key={index}>{feature}</li>
            ))}
          </ul>
        </motion.div>
      ))}
    </div>
  );
};

export default RoadmapList;
