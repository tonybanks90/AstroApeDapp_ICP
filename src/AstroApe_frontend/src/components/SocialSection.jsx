import { companyLogos, socialsData } from "../constants";

const SocialSection = ({ className }) => {
  return (
    <div className={className}>
      <h5 className="tagline mb-6 text-center text-n-1/50">
        Join our vibrant Community to get the latest updates
      </h5>
      <ul className="flex">
        {socialsData.map((social, index) => (
          <li
            className="flex items-center justify-center flex-1 h-[8.5rem]"
            key={social.id}
          >
            <a href={social.url} target="_blank" rel="noopener noreferrer">
              <img
                src={companyLogos[index]}
                width={134}
                height={28}
                alt={`${social.title} logo`}
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SocialSection;
