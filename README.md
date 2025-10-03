# 🚀 AstroApe

> A fully decentralized meme coin launchpad built entirely on the Internet Computer Protocol (ICP)

**Live Demo:** [https://lxxcl-eyaaa-aaaap-qhsgq-cai.icp0.io/](https://lxxcl-eyaaa-aaaap-qhsgq-cai.icp0.io/)

⚠️ **Note:** AstroApe v2 is currently in active development. Watch this space for updates!

---

## 📖 Overview

**AstroApe** is a multichain launchpad on the Internet Computer that enables users to create and trade meme tokens backed by real Bitcoin, Ethereum, and Solana—without requiring initial liquidity. Using **Chain-Key cryptography** and a **bonding curve mechanism**, AstroApe provides:

✨ **Key Features:**
- 🎯 **Fair Token Launches** with dynamic bonding curve pricing
- 🔗 **Cross-Chain Support** via ckBTC, ckETH, and ckSOL (Chain-Key wrapped assets)
- 🏦 **Automatic DEX Migration** to KongSwap once 80% of supply is sold
- 🌉 **Bridge to External Chains** (BTC Runes, ETH ERC-20, SOL SPL) via Omnity
- 💎 **Treasury Revenue** collection with 1% fee on all trades
- 🎮 **Gamified Point System** to incentivize user engagement
- 🔐 **Fully On-Chain** frontend and backend for true decentralization

---

## 🏗️ Technical Architecture

AstroApe leverages ICP's unique capabilities to create a fully decentralized launchpad ecosystem:

### Core Canisters

#### 1. **Frontend Canister (Asset Canister)**
- Entire UI served directly from the blockchain at `https://[canister-id].icp0.io`
- Zero reliance on Web2 hosting (AWS, Vercel, etc.)
- Censorship-resistant and immune to DNS seizures

#### 2. **ckBoost Canister**
- **Purpose:** Facilitates Chain-Key integration for wrapping native assets
- **How ICP is Leveraged:** Uses Chain-Key cryptography to directly interact with Bitcoin, Ethereum, and Solana networks without bridges or oracles
- **User Flow:** 
  - Users send BTC to ICP-controlled Bitcoin address
  - ckBoost mints ckBTC (1:1) to user's wallet
  - Same process for ETH → ckETH and SOL → ckSOL

#### 3. **TokenFactory Canister**
- **Purpose:** Deploys new ICRC-2 tokens programmatically on-demand
- **Token Supply Rules:**
  - **BTC-themed tokens:** 21M supply, 8 decimals
  - **ETH-themed tokens:** 1B supply, 18 decimals
  - **SOL-themed tokens:** 1B supply, 9 decimals
- **Integration:** Generates unique Vault subaccount ID per token and stores mapping: `token_principal ↔ vault_subaccount`

#### 4. **BondingCurve Canister**
- **Purpose:** Manages token buy/sell operations with dynamic pricing
- **Buying Process:**
  1. User approves BondingCurve to spend ckBTC (ICRC-2 approve)
  2. BondingCurve transfers ckBTC from user via `transferFrom`
  3. Calls Vault: `deposit(token_id, amount, "ckBTC")` → funds go to token's subaccount
  4. Mints new tokens to user wallet
  5. Price increases algorithmically based on supply
- **Selling Process:**
  1. User approves token burn
  2. BondingCurve calculates sell price
  3. Burns user's tokens
  4. Calls Vault: `withdraw(token_id, amount, user_wallet, "ckBTC")`
  5. Vault sends ckBTC to user
- **Curve Completion:** Trading halts at 80% supply sold → triggers migration

#### 5. **Vault Canister**
- **Purpose:** Secure escrow for ckBTC/ckETH/ckSOL reserves during bonding curve phase
- **Subaccount Architecture:**
  - Single vault canister with unique 32-byte subaccounts per token
  - Subaccount derivation: `hash(token_principal + creation_timestamp)`
  - Complete isolation: Token A reserves cannot affect Token B
- **Security Model:**
  - Whitelist authorization (only BondingCurve & LiquidityManager approved)
  - Per-token isolation prevents cross-contamination exploits
  - Emergency pause (per subaccount & global)
  - Withdrawal limits and rate limiting
  - Transaction replay protection
  - Immutable after security audit

#### 6. **LiquidityManager Canister**
- **Purpose:** Automates token migration to KongSwap DEX
- **Migration Flow:**
  1. BondingCurve detects 80% supply sold
  2. Notifies LiquidityManager via `initiate_migration(token_id)`
  3. Validates eligibility (threshold met, not already migrated)
  4. Prepares liquidity allocation from Vault
  5. Calculates remaining 20% supply for liquidity
  6. Approves KongSwap to spend tokens and ckBTC
  7. Creates permanent liquidity pool on KongSwap

---

## 🔑 Key Innovations

### Chain-Key Integration
- Direct Bitcoin, Ethereum, and Solana integration without bridges
- ICP canisters sign transactions natively on external chains
- 1:1 peg for all wrapped assets (ckBTC, ckETH, ckSOL)

### Bonding Curve Mechanics
- **Zero Initial Liquidity Required:** Users can launch tokens without capital
- **Dynamic Pricing:** Price increases as supply is purchased
- **Fair Launch:** Everyone buys at the curve price—no presale or insider advantages
- **Automatic Graduation:** Seamless migration to DEX at 80% supply

### Security Features
- Subaccount isolation per token
- Multi-signature withdrawals (3-of-5)
- Role-Based Access Control (RBAC)
- Time-locked withdrawal mechanisms
- Emergency pause functionality
- Immutable audit trails

### Revenue Model
- 1% fee on all bonding curve trades → AstroApe treasury
- 1% fee on post-curve DEX trades → AstroApe treasury
- Treasury dashboard with real-time metrics

---

## ⚡ Getting Started

### Prerequisites
- Node.js (v16+)
- DFX SDK (latest version)
- Internet Computer wallet (Internet Identity or Oisy)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/AstroApe.git
cd AstroApe
```

2. **Install dependencies**
```bash
npm install
```

3. **Start local replica**
```bash
dfx start --background
```

4. **Deploy all canisters**
```bash
bash deploy.sh
```

This script:
- Deploys backend canisters (Vault, BondingCurve, TokenFactory, LiquidityManager)
- Uploads ICRC-2 token Wasm modules
- Configures canister permissions and integrations

5. **Generate Candid interfaces**
```bash
npm run generate
```

---

## 🖥️ Running the Frontend

### Local Development

```bash
cd src/AstroApe_Frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:8080`, proxying API requests to local replica at `:4943`.

### Accessing Your Local Deployment

Once deployed, your application will be available at:
```
http://localhost:4943?canisterId={asset_canister_id}
```

---

## 🌐 Deployment

### Local Testnet
```bash
dfx deploy --network local
```

### IC Mainnet
```bash
dfx deploy --network ic
```

**Production URL:** `https://[canister-id].icp0.io/`

---

## 🎯 Roadmap

### Milestone 1 (Current)
- ✅ ckBoost integration for BTC/ETH/SOL wrapping
- ✅ Referral system with multi-tier rewards
- ✅ ICP wallet authentication (Internet Identity 2.0 + Oisy)
- ✅ Vault canister with subaccount security
- 🔄 Comprehensive testing & mainnet deployment

### Milestone 2 (In Progress)
- 🔄 Point system & gamification
- 🔄 Post-curve trading via KongSwap
- 🔄 Chain-Key token swaps (ckBTC ↔ ckETH)
- 📋 Final testing & deployment

### Future Milestones
- Cross-chain bridging via Omnity
- Additional DEX integrations
- Governance token launch
- Mobile app development

---

## 📚 Documentation

- [ICP Quick Start](https://internetcomputer.org/docs/current/developer-docs/setup/deploy-locally)
- [SDK Developer Tools](https://internetcomputer.org/docs/current/developer-docs/setup/install)
- [Motoko Programming Language Guide](https://internetcomputer.org/docs/current/motoko/main/motoko)
- [ICRC-1 & ICRC-2 Token Standards](https://github.com/dfinity/ICRC-1)
- [Chain-Key Cryptography](https://internetcomputer.org/how-it-works/chain-key-technology)

---

## 🛠️ Tech Stack

**Backend:**
- Motoko (ICP smart contracts)
- ICRC-2 token standard
- Chain-Key cryptography

**Frontend:**
- React.js
- TailwindCSS
- ICP Agent (JS library)

**Infrastructure:**
- Internet Computer Protocol (ICP)
- KongSwap DEX
- Omnity Network (bridging)

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- **Website:** [AstroApe.io](https://astroape.io)
- **Twitter:** [@AstroApeICP](https://twitter.com/AstroApeICP)
- **Discord:** [Join our community](https://discord.gg/astroape)
- **Documentation:** [docs.astroape.io](https://docs.astroape.io)

---

## 💬 Support

For questions, issues, or feedback:
- Open an issue on GitHub
- Join our Discord community
- Email: support@astroape.io

---

**Built with ❤️ on the Internet Computer**