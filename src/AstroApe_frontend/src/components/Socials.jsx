import { companyLogos } from "../constants";

const Socials = ({ className }) => {
  return (
    <div className={className}>
      <ul className="flex flex-wrap justify-center space-x-4 mt-2">
        {companyLogos.map((logo, index) => (
          <li
            className="flex items-center justify-center h-12 w-12 bg-n-7 rounded-full"
            key={index}
          >
            <img src={logo} alt={`social-logo-${index}`} className="w-6 h-6" />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Socials;
