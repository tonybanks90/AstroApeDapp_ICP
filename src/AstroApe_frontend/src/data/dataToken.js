import { logo9, twitter, websiteicon, telegram, Dog, pepe, aidog, egg, kingkus, cyber } from "../assets"; // Import actual images

export const tokenData = [
  {
    id: 1,
    name: "Donald Kingkus",
    basepair: "ETH",
    ticker: "kingkus",
    numReplies: 300,
    xmarketCap: "$4.3M",
    logo: kingkus,
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
    owned: {
      tickeramount: "0.85 BTC",
      tickerpercent: "$78K",
    },
    value: {
      btcvalue: "0.85 BTC",
      usdvalue: "$78K",
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
    bonded: "40%", 
    dev: "fjwx2-qql6m",
    icons: {
      twitter: twitter,
      website: websiteicon,
      telegram: telegram,
    },
    chartData: [
      { id: 1, time: '2023-01-01', open: 100, high: 105, low: 95, close: 102 },
      { id: 1, time: '2023-01-02', open: 102, high: 110, low: 101, close: 108 },
      { id: 1, time: '2023-01-03', open: 108, high: 112, low: 107, close: 110 },
      { id: 1, time: '2023-01-04', open: 110, high: 115, low: 109, close: 113 },
      { id: 1, time: '2023-01-05', open: 113, high: 120, low: 110, close: 118 }
    ],
  },
  {
    id: 2,
    name: "Cyber Ape",
    ticker: "CYBA",
    basepair: "SOL",
    numReplies: 150,
    xmarketCap: "$2.8M",
    logo: cyber,
    websitelink: "https://cyberape.io",
    telegramlink: "https://t.me/CyberApeCommunity",
    twitterlink: "https://twitter.com/CyberApe",
    tagline: "The future is now, and it's cyber.",
    ascended: "Engraving on the blockchain...",
    priceUSD: "$0.005",
    priceSats: "3.22 sats",
    changes: {
      "5m": "0.5%",
      "1h": "-10.4%",
      "6h": "-15.2%",
      "24h": "-8.9%",
    },
    marketCap: {
      btc: "0.85 BTC",
      usd: "$78K",
    },
    owned: {
      tickeramount: "0.85 BTC",
      tickerpercent: "$78K",
    },
    value: {
      btcvalue: "0.85 BTC",
      usdvalue: "$78K",
    },
    volume: {
      btc: "9.2 BTC",
      usd: "$900K",
    },
    transactions: {
      total: 7560,
      buys: 6421,
      sells: 1139,
    },
    holders: 205,
    supply: "50M",
    created: "5d",
    bonded: "60%", 
    dev: "fjwx2-qql6m",
    icons: {
      twitter: twitter,
      website: websiteicon,
      telegram: telegram,
    },
    chartData: [
      { id: 2, time: '2023-02-01', open: 200, high: 210, low: 190, close: 205 },
      { id: 2, time: '2023-02-02', open: 205, high: 220, low: 200, close: 215 },
      { id: 2, time: '2023-02-03', open: 215, high: 230, low: 210, close: 225 },
      { id: 2, time: '2023-02-04', open: 225, high: 235, low: 220, close: 230 },
      { id: 2, time: '2023-02-05', open: 230, high: 240, low: 225, close: 238 }
    ],
  }
];

// Exporting the tokenData array for use in other components
export default tokenData;
