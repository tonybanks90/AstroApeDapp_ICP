import {
    benefitIcon1,
    Astroapplogo3,
    btcicon,
    ethicon,
    solicon,
    baseicon,
    suiicon,
    logo9,
    DiscordLogo,
    TwitterLogo,
    OpenChatLogo,
    telegramicon,
    benefitIcon2,
    benefitIcon3,
    benefitIcon4,
    benefitImage2,
    chromecast,
    disc02,
    discordBlack,
    file02,
    homeSmile,
    notification2,
    notification3,
    notification4,
    plusSquare,
    recording01,
    recording03,
    searchMd,
    sliders04,
    websiteicon,
    telegram,
    twitter,
    benefitCard1,
    benefitCard2,
    benefitCard3,
    benefitCard4

  } from "../../src/assets";
  import {
  FaRocket,
  FaUpload,
  FaUser,
  FaShareAlt,
  FaWallet,
  FaFaucet,
} from "react-icons/fa";


export const coininfo = {
  name: "Dudin the Duck",
  ticker: "DUCK",
  logo: logo9,
  websitelink: "https://dudintheduck.com",
  telegramlink: "https://t.me/DudinTheDuck",
  twitterlink: "https://twitter.com/DudinTheDuck",
  tagline: "Put some respect on Dudin's name.",
  ascended: "This rune is being etched...",
  priceUSD: "$0.01",
  priceSats: "5.99 sats",
  changes: {
    "5m": "1.1%",
    "1h": "-22.9%",
    "6h": "-21.7%",
    "24h": "-22.1%",
  },
  marketCap: {
    btc: "1.26 BTC",
    usd: "$115K",
  },
  volume: {
    btc: "11.6 BTC",
    usd: "$1.1M",
  },
  transactions: {
    total: 10445,
    buys: 8857,
    sells: 1588,
  },
  holders: 317,
  supply: "21M",
  created: "2d",
  dev: "011010101011",
  twittericon: twitter,
  websiteicon: websiteicon,
  telegramicon: telegram,
};

  
 export const navigation = [
  {
    id: "0",
    title: "New Pairs",
    url: "/Token/1",
    icon: FaRocket,
  },
  {
    id: "1",
    title: "Deploy Token",
    url: "/Token/2",
    icon: FaUpload,
  },
  {
    id: "2",
    title: "Profile",
    url: "/Token/profile",
    icon: FaUser,
  },
  {
    id: "3",
    title: "Referrals",
    url: "/Token/4",
    icon: FaShareAlt,
  },
  {
    id: "4",
    title: "Wallet",
    url: "/Token/8",
    icon: FaWallet,
    onlyMobile: true,
  },
  {
    id: "5",
    title: "Faucet",
    url: "/Token/faucet",
    icon: FaFaucet,
    onlyMobile: true,
  },
];

  

  export const navigation2 = [
    {
      id: "0",
      title: "Features",
      url: "#features",
    },
    {
      id: "1",
      title: "Tokenomics",
      url: "#tokenomics",
    },
    {
      id: "2",
      title: "Roadmap",
      url: "#roadmap",
    },
   

    
  ];

  export const leaderboardData = [
    { name: "TopUser1", volume: "12.45 ICP", rank: 1 },
    { name: "TopUser2", volume: "9.76 ICP", rank: 2 },
    { name: "TopUser3", volume: "8.65 ICP", rank: 3 },
    { name: "User4", volume: "5.34 ICP" },
    { name: "User5", volume: "4.23 ICP" },
    { name: "User6", volume: "3.12 ICP" },
    { name: "User7", volume: "2.99 ICP" },
    { name: "User8", volume: "2.87 ICP" },
    { name: "User9", volume: "2.75 ICP" },
    { name: "User10", volume: "1.64 ICP" },
  ];
  
  export const heroIcons = [homeSmile, file02, searchMd, plusSquare];
  
  export const notificationImages = [notification4, notification3, notification2];
  
  export const companyLogos = [telegramicon, TwitterLogo, OpenChatLogo, DiscordLogo];
  
  export const brainwaveServices = [
    "Photo generating",
    "Photo enhance",
    "Seamless Integration",
  ];
  
  export const brainwaveServicesIcons = [
    recording03,
    recording01,
    disc02,
    chromecast,
    sliders04,
  ];
  

  
  export const collabText = {
    "0": "AstroApe charges a minimal one percent fee on all transactions. These fees not only support the platform's operations but also provide continuous value to token holders through the token economy.",
    "1": "Our governance model empowers token holders to have a say in the platform's future. Users can vote on key decisions, upgrades, and changes, ensuring the community plays a crucial role in AstroApe's development.",
    "2": "We offer attractive incentives for users who stake their tokens. Stakers earn rewards, contributing to network security and decentralization while benefiting from their participation.",
    "3": "Holding AstroApe tokens unlocks access to premium features, such as advanced trading bots and special community events, enhancing the overall user experience.",
  };
  
  
  export const collabContent = [
    {
      id: "0",
      title: "Transaction Fees",
      text: collabText,
    },
    {
      id: "1",
      title: "Governance",
      text: collabText,
    },
    {
      id: "2",
      title: "Staking and Rewards",
      text: collabText,
    },
    {
      id: "3",
      title: "Exclusive Features",
      text: collabText,
    },
  ];
  
  export const roadmap = [
    {
      id: "0",
      title: "Q4/Q1 2024/25: Platform Development",
      description: "Complete the development of the AstroApe platform, integrating multi-chain token deployment capabilities and bonding curve mechanisms.",
      features: [
        "Multi-chain token deployer",
        "Bonding curve integration",
        "Cross-chain compatibility with ICP and Ethereum"
      ],
    },
    {
      id: "1",
      title: "Q2 2025: Beta Testing & Security Audits",
      description: "Initiate beta testing with select users and conduct rigorous security audits to ensure platform reliability and safety.",
      features: [
        "Beta testing phase with early adopters",
        "Security audits by leading blockchain security firms",
        "Bug fixes and performance enhancements"
      ],
    },
    {
      id: "2",
      title: "Q3 2025: Mainnet Launch ",
      description: "Launch the platform on the mainnet, conduct an airdrop of the native utility token to early supporters, and initiate the first funding round.",
      features: [
        "Mainnet launch with full feature set",
        "First funding round",
        "CD/CI"
      ],
    },
    {
      id: "3",
      title: "Q4 2025: Ecosystem Expansion",
      description: "Expand the AstroApe ecosystem by integrating with additional blockchains and decentralizing the platform.",
      features: [
        "Integration with Solana and Bitcoin",
        "Decentralize via SNS",
        "Partnerships with other DeFi platforms"
      ],
    },
    {
      id: "4",
      title: "Q1 2026: DEX Integration & Staking",
      description: "Integrate with decentralized exchanges (DEXs) for seamless trading and introduce staking features for platform tokens.",
      features: [
        "DEX integration for token trading",
        "Staking mechanisms for yield generation",
        "Enhanced liquidity management"
      ],
    },
  ];
  
  
  
  export const benefits = [
    {
      id: "0",
      title: "Create a Memecoin",
      text: "Deploy an ICRC-2 Token on ICP, Ethereum, EVM chains and soon Solana for Under $2",
      backgroundUrl: "/assets/Astroapplogo3.png",
      iconUrl: benefitIcon1,
      imageUrl: Astroapplogo3,
    },
    {
      id: "1",
      title: "Trade Memecoins",
      text: "Buy Meme coins when they launch, Sell to cash in profits or cut down Losses",
      backgroundUrl: "assets/benefits/card-2.svg",
      iconUrl: benefitIcon2,
      imageUrl: Astroapplogo3,
      light: true,
    },
    {
      id: "2",
      title: "Multichain Governance",
      text: " AstroApe empowers users from various blockchain networks to participate in shaping the future of the platform, ensuring that it remains community-driven and adaptable to the needs of its diverse user base.",
      backgroundUrl: "assets/benefits/card-3.svg",
      iconUrl: benefitIcon3,
      imageUrl: Astroapplogo3,
    },
    {
      id: "3",
      title: "Authentication",
      text: "Users can Sign In with,Internet Identity, Ethereum (SIWE), Sign In with Solana (SIWS), enabling users from various blockchains to securely sign in, deploy, and trade tokens on the platform.",
      backgroundUrl: "assets/benefits/card-4.svg",
      iconUrl: benefitIcon4,
      imageUrl: Astroapplogo3,
      light: true,
    },
    {
      id: "4",
      title: "Simply Easy UI to Use",
      text: "Our DApp has simple UI/UX ensures that launching tokens, trading, participating in referral programs, and engaging in governance are all accessible, efficient, and user-friendly experiences.",
      backgroundUrl: "assets/benefits/card-5.svg",
      iconUrl: benefitIcon1,
      imageUrl: Astroapplogo3,
    },
    {
      id: "5",
      title: "Bonding Curve",
      text: "Our unique bonding curve allows users to launch memecoins without initial liquidity, ensuring fair and stable pricing. As demand increases, prices adjust automatically, and once the curve is complete, liquidity is added to DEX and burned, securing long-term market integrity and sustainable trading.",
      backgroundUrl: "assets/benefits/card-6.svg",
      iconUrl: benefitIcon2,
      imageUrl: Astroapplogo3,
    },
  ];
  
  export const socialsData = [
    {
      id: "0",
      title: "Telegram",
      iconUrl: telegramicon,
      url: "https://t.me/+g7W5Phsre6w1ZjQ0",
    },
    {
      id: "1",
      title: "Twitter",
      iconUrl: DiscordLogo,
      url: "https://x.com/AstroApe_",
    },
    
    {
      id: "2",
      title: "OpenChat",
      iconUrl: TwitterLogo,
      url: "https://oc.app/group/htzn6-ayaaa-aaaar-bf6lq-cai/?ref=ewnwv-5qaaa-aaaar-bf6aa-cai&code=91706620c34ec1ca",
    },
    {
      id: "3",
      title: "Discord",
      iconUrl: OpenChatLogo,
      url: "https://discord.gg/AVwCZj9p",
    },
    
  ];