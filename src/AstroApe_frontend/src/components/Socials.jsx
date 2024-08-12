import { socialsData, companyLogos } from '../constants'; // Adjust the import path as needed

// Merging the socialsData with the corresponding logos
export const socials = socialsData.map((social, index) => ({
  ...social,
  iconUrl: companyLogos[index], // Add the logo from companyLogos by matching index
}));

const Socials = ({ className }) => {
  return (
    <div className={className}>
      <ul className="flex flex-wrap justify-center space-x-4 mt-2">
        {socials.map((social) => (
          <li
            className="flex items-center justify-center h-12 w-12 bg-n-7 rounded-full"
            key={social.id}
          >
            <a href={social.url} target="_blank" rel="noopener noreferrer">
              <img
                src={social.iconUrl}
                alt={`${social.title}-logo`}
                className="w-6 h-6"
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Socials;
