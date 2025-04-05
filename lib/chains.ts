export enum SupportedChainId {
  ETH_SEPOLIA = 11155111,
  AVAX_FUJI = 43113,
  BASE_SEPOLIA = 84532,
  ETHEREUM = 1,
  AVALANCHE = 43114,
  BASE = 8453,
  LINEA = 59144,
  POLYGON = 137,
  ARBITRUM = 42161,
}

// Mapping chain IDs to USDC contract addresses
export const CHAIN_IDS_TO_USDC_ADDRESSES: Record<number, string> = {
  [SupportedChainId.ETH_SEPOLIA]: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  [SupportedChainId.AVAX_FUJI]: "0x5425890298aed601595a70AB815c96711a31Bc65",
  [SupportedChainId.BASE_SEPOLIA]: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  [SupportedChainId.ETHEREUM]: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  [SupportedChainId.AVALANCHE]: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
  [SupportedChainId.BASE]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  [SupportedChainId.LINEA]: "0x176211869cA2b568f2A7D4EE941E073a821EE1ff",
  [SupportedChainId.POLYGON]: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  [SupportedChainId.ARBITRUM]: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
}

// Mapping chain IDs to token messenger contract addresses
export const CHAIN_IDS_TO_TOKEN_MESSENGER: Record<number, string> = {
  [SupportedChainId.ETH_SEPOLIA]: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
  [SupportedChainId.AVAX_FUJI]: "0xeb08f243E5d3FCFF26A9E38Ae5520A669f4019d0",
  [SupportedChainId.BASE_SEPOLIA]: "0x877b8e8c9e2383077809787ED6F279ce01CB4cc8",
  [SupportedChainId.ETHEREUM]: "0xBd3fa81B58Ba92a82136038B25aDec7066af3155",
  [SupportedChainId.AVALANCHE]: "0x6B25532e1060CE10cc3B0A99e5683b91BFDe6982",
  [SupportedChainId.BASE]: "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962",
  [SupportedChainId.LINEA]: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
}

// Mapping chain IDs to message transmitter contract addresses
export const CHAIN_IDS_TO_MESSAGE_TRANSMITTER: Record<number, string> = {
  [SupportedChainId.ETH_SEPOLIA]: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
  [SupportedChainId.AVAX_FUJI]: "0xa9fB1b3009DCb79E2fe346c16a604B8Fa8aE0a79",
  [SupportedChainId.BASE_SEPOLIA]: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
  [SupportedChainId.ETHEREUM]: "0x0a992d191DEeC32aFe36203Ad87D7d289a738F81",
  [SupportedChainId.AVALANCHE]: "0x8186359aF5F57FbB40c6b14A588d2A59C0C29880",
  [SupportedChainId.BASE]: "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962",
  [SupportedChainId.LINEA]: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
}

// Mapping chain IDs to destination domains for CCTP
export const DESTINATION_DOMAINS: Record<number, number> = {
  [SupportedChainId.ETH_SEPOLIA]: 0,
  [SupportedChainId.AVAX_FUJI]: 1,
  [SupportedChainId.BASE_SEPOLIA]: 6,
  [SupportedChainId.ETHEREUM]: 0,
  [SupportedChainId.AVALANCHE]: 1,
  [SupportedChainId.BASE]: 6,
  [SupportedChainId.LINEA]: 7,
}

// Chain ID to Network Enum mapping for 1inch
export const CHAIN_ID_TO_NETWORK_ENUM: Record<number, number> = {
  [SupportedChainId.ETHEREUM]: 1,
  [SupportedChainId.POLYGON]: 137,
  [SupportedChainId.AVALANCHE]: 43114,
  [SupportedChainId.ARBITRUM]: 42161,
  [SupportedChainId.BASE]: 8453,
  [SupportedChainId.LINEA]: 59144,
}

// Chain name to Chain ID mapping
export const CHAIN_NAME_TO_ID: Record<string, number> = {
  ethereum: SupportedChainId.ETHEREUM,
  polygon: SupportedChainId.POLYGON,
  avax: SupportedChainId.AVALANCHE,
  arbitrum: SupportedChainId.ARBITRUM,
  base: SupportedChainId.BASE,
  linea: SupportedChainId.LINEA,
}

