"use client";

import { useState, useCallback } from "react";
import { useAccount, useWalletClient, usePublicClient, useSwitchChain } from "wagmi";
import {
  createPublicClient,
  http,
  encodeFunctionData,
  formatUnits,
  parseUnits,
  type PublicClient,
  type Chain,
  type Hex,
  type WalletClient,
  type HttpTransport,
  type Account,
} from "viem";
import { 
  sepolia, 
  avalancheFuji, 
  baseSepolia, 
  avalanche, 
  mainnet, 
  polygon, 
  base, 
  linea,
  arbitrum,
  optimism
} from "viem/chains";
import {
  SupportedChainId,
  CHAIN_IDS_TO_USDC_ADDRESSES,
  CHAIN_IDS_TO_TOKEN_MESSENGER,
  DESTINATION_DOMAINS,
} from "../lib/chains";
import axios from 'axios';
import { useConfig } from "wagmi";

export type TransferStep =
  | "idle"
  | "approving"
  | "burning"
  | "waiting-attestation"
  | "completed"
  | "error";

// 重命名為 testChains，避免與 useConfig 鉤子返回的 chains 衝突
const testChains = {
  [SupportedChainId.ETH_SEPOLIA]: sepolia,
  [SupportedChainId.AVAX_FUJI]: avalancheFuji,
  [SupportedChainId.BASE_SEPOLIA]: baseSepolia,
};

// 添加主網鏈配置
const mainChains = {
  [SupportedChainId.ETHEREUM]: mainnet,
  [SupportedChainId.AVALANCHE]: avalanche,
  [SupportedChainId.POLYGON]: polygon,
  [SupportedChainId.BASE]: base,
  [SupportedChainId.LINEA]: linea,
  [SupportedChainId.ARBITRUM]: arbitrum,
};

// 結合測試網和主網鏈配置
const allChains = {
  ...testChains,
  ...mainChains,
};

export interface CCTPTransferParams {
  // 源鏈 ID
  sourceChainId: SupportedChainId;
  // 目標鏈 ID
  destinationChainId: SupportedChainId;
  // 轉移金額
  amount: string;
  // 轉移類型（快速或標準）
  transferType: "fast" | "standard";
  // 可選的目標地址，默認使用當前連接的錢包地址
  destinationAddress?: string;
}

export interface CCTPTransferResult {
  // 執行跨鏈轉移
  executeTransfer: () => Promise<any>;
  // 查詢餘額
  getBalance: (chainId: SupportedChainId) => Promise<string>;
  // 重置狀態
  reset: () => void;
  // 當前步驟
  currentStep: TransferStep;
  // 日誌
  logs: string[];
  // 錯誤信息
  error: string | null;
  // 加載狀態
  isLoading: boolean;
  // 成功狀態
  isSuccess: boolean;
  // 錯誤狀態
  isError: boolean;
}

// CCTP 實現的區塊鏈提供者連接器
class CCTPWalletConnector {
  private walletClient: WalletClient;
  private publicClient: PublicClient;
  
  constructor(walletClient: WalletClient, publicClient: PublicClient) {
    this.walletClient = walletClient;
    this.publicClient = publicClient;
  }

  // 這裡可能需要實現與 CCTP 合約交互的方法
  // 例如發送交易、獲取交易狀態等
}

export function useCCTPTransfer({
  sourceChainId,
  destinationChainId,
  amount,
  transferType,
  destinationAddress,
}: CCTPTransferParams): CCTPTransferResult {
  const [currentStep, setCurrentStep] = useState<TransferStep>("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);

  // Wagmi hooks for wallet info, wallet client, and network switching
  const { address, chain } = useAccount();
  const { data: walletClient } = useWalletClient({ chainId: sourceChainId });
  const publicClient = usePublicClient();
  const { switchChain } = useSwitchChain();
  const { chains: wagmiChains } = useConfig();

  console.log("chain", chain)
  const DEFAULT_DECIMALS = 6;

  const addLog = useCallback((message: string) => {
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ${message}`,
    ]);
  }, []);

  // Create a public client for a given chain using Viem
  const getPublicClient = useCallback((chainId: SupportedChainId) => {
    // 首先檢查 wagmi 配置中的鏈
    const wagmiChainConfig = wagmiChains[chainId as keyof typeof wagmiChains] as Chain | undefined;
    if (wagmiChainConfig) {
      return createPublicClient({
        chain: wagmiChainConfig,
        transport: http(),
      });
    }
    
    // 如果 wagmi 配置中沒有，檢查本地定義的鏈
    const localChainConfig = allChains[chainId as keyof typeof allChains];
    if (localChainConfig) {
      return createPublicClient({
        chain: localChainConfig,
        transport: http(),
      });
    }
    
    throw new Error(`Unsupported chainId for getPublicClient: ${chainId}`);
  }, [wagmiChains]);

  // Get the token balance (USDC) of the connected account
  const getBalance = useCallback(async (chainId: SupportedChainId) => {
    if (!address) throw new Error("No connected wallet");
    const client = getPublicClient(chainId);
    const usdcAddress = CHAIN_IDS_TO_USDC_ADDRESSES[chainId as keyof typeof CHAIN_IDS_TO_USDC_ADDRESSES];
     if (!usdcAddress) {
        throw new Error(`USDC address not found for chainId: ${chainId}`);
     }
    const balance = await client.readContract({
      address: usdcAddress as `0x${string}`,
      abi: [
        {
          constant: true,
          inputs: [{ name: "_owner", type: "address" }],
          name: "balanceOf",
          outputs: [{ name: "balance", type: "uint256" }],
          payable: false,
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "balanceOf",
      args: [address],
    });
    return formatUnits(balance as bigint, DEFAULT_DECIMALS);
  }, [address, getPublicClient]);

  // Approve the USDC transfer on the source chain
//   const approveUSDC = useCallback(async () => {
//     setCurrentStep("approving");
//     addLog("Approving USDC transfer...");

//     if (!walletClient)
//       throw new Error("Wallet client not available for approval transaction");
    
//     // 首先檢查 wagmi 配置中的鏈
//     let sourceChainConfig = wagmiChains[sourceChainId as keyof typeof wagmiChains] as Chain | undefined;
    
//     // 如果 wagmi 配置中沒有，檢查本地定義的鏈
//     if (!sourceChainConfig) {
//       sourceChainConfig = allChains[sourceChainId as keyof typeof allChains];
//     }
    
//     const usdcAddress = CHAIN_IDS_TO_USDC_ADDRESSES[sourceChainId as keyof typeof CHAIN_IDS_TO_USDC_ADDRESSES];
//     const tokenMessengerAddress = CHAIN_IDS_TO_TOKEN_MESSENGER[sourceChainId as keyof typeof CHAIN_IDS_TO_TOKEN_MESSENGER];

//     if (!sourceChainConfig || !usdcAddress || !tokenMessengerAddress) {
//         throw new Error(`Configuration missing for source chain: ${sourceChainId}`);
//     }

//     try {
//       const tx = await walletClient.sendTransaction({
//         chain: sourceChainConfig,
//         to: usdcAddress as Hex,
//         data: encodeFunctionData({
//           abi: [
//             {
//               type: "function",
//               name: "approve",
//               stateMutability: "nonpayable",
//               inputs: [
//                 { name: "spender", type: "address" },
//                 { name: "amount", type: "uint256" },
//               ],
//               outputs: [{ name: "", type: "bool" }],
//             },
//           ],
//           functionName: "approve",
//           args: [tokenMessengerAddress as Hex, BigInt("10000000000")],
//         }),
//       });
//       addLog(`USDC Approval Tx: ${tx}`);
//       return tx;
//     } catch (err) {
//       setError("Approval failed");
//       throw err;
//     }
//   }, [sourceChainId, walletClient, addLog, wagmiChains]);

  // Burn USDC on the source chain
  const burnUSDC = async (
    client: NonNullable<typeof walletClient>,
    sourceChainIdNum: number,
    amount: bigint,
    destinationChainIdNum: number,
    destinationAddress: string,
    transferType: "fast" | "standard"
  ) => {
    setCurrentStep("burning");
    addLog("Burning USDC...");

    // 首先檢查 wagmi 配置中的鏈
    let sourceChainConfig = wagmiChains[sourceChainIdNum as keyof typeof wagmiChains] as Chain | undefined;
    
    // 如果 wagmi 配置中沒有，檢查本地定義的鏈
    if (!sourceChainConfig) {
      sourceChainConfig = allChains[sourceChainIdNum as keyof typeof allChains];
    }

    const tokenMessengerAddress = CHAIN_IDS_TO_TOKEN_MESSENGER[sourceChainIdNum as keyof typeof CHAIN_IDS_TO_TOKEN_MESSENGER];
    const usdcAddress = CHAIN_IDS_TO_USDC_ADDRESSES[sourceChainIdNum as keyof typeof CHAIN_IDS_TO_USDC_ADDRESSES];
    const destinationDomain = DESTINATION_DOMAINS[destinationChainIdNum as keyof typeof DESTINATION_DOMAINS];

    if (!sourceChainConfig || !tokenMessengerAddress || !usdcAddress || destinationDomain === undefined) {
      throw new Error(`Configuration missing for burn transaction. Source: ${sourceChainIdNum}, Dest: ${destinationChainIdNum}`);
    }

    try {
      const finalityThreshold = transferType === "fast" ? 1000 : 2000;
      const maxFee = amount - BigInt(1);
      const mintRecipient = `0x${destinationAddress
        .replace(/^0x/, "")
        .padStart(64, "0")}`;

      const tx = await client.sendTransaction({
        chain: sourceChainConfig,
        to: tokenMessengerAddress as `0x${string}`,
        data: encodeFunctionData({
          abi: [
            {
              type: "function",
              name: "depositForBurn",
              stateMutability: "nonpayable",
              inputs: [
                { name: "amount", type: "uint256" },
                { name: "destinationDomain", type: "uint32" },
                { name: "mintRecipient", type: "bytes32" },
                { name: "burnToken", type: "address" },
                { name: "hookData", type: "bytes32" },
                { name: "maxFee", type: "uint256" },
                { name: "finalityThreshold", type: "uint32" },
              ],
              outputs: [],
            },
          ],
          functionName: "depositForBurn",
          args: [
            amount,
            destinationDomain,
            mintRecipient as Hex,
            usdcAddress as Hex,
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            maxFee,
            finalityThreshold,
          ],
        }),
      });

      addLog(`Burn Tx: ${tx}`);
      return tx;
    } catch (err) {
      setError("Burn failed");
      throw err;
    }
  };

  // Poll for attestation from the API until it's complete
  const retrieveAttestation = async (
    transactionHash: string,
    sourceChainIdNum: number
  ) => {
    setCurrentStep("waiting-attestation");
    addLog("Retrieving attestation...");

    const sourceDomain = DESTINATION_DOMAINS[sourceChainIdNum as keyof typeof DESTINATION_DOMAINS];
    if (sourceDomain === undefined) {
        throw new Error(`Source domain not found for chainId: ${sourceChainIdNum}`);
    }

    const url = `https://iris-api-sandbox.circle.com/v2/messages/${sourceDomain}?transactionHash=${transactionHash}`;

    let attempts = 0;
    const maxAttempts = 30;
    const waitTime = 5000;

    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(url);
        if (response.data?.messages?.[0]?.status === "complete") {
          addLog("Attestation retrieved!");
          return response.data.messages[0];
        }
        addLog(`Waiting for attestation... (${attempts + 1}/${maxAttempts})`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        attempts++;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          addLog(`Attestation not found yet, retrying... (${attempts + 1}/${maxAttempts})`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          attempts++;
          continue;
        }
        if (attempts >= maxAttempts - 1) {
            setError("Attestation retrieval failed after maximum attempts");
            addLog("Error: Attestation retrieval failed after maximum attempts");
            throw error;
         } else {
            addLog(`Error retrieving attestation: ${error instanceof Error ? error.message : 'Unknown error'}. Retrying... (${attempts + 1}/${maxAttempts})`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            attempts++;
         }
      }
    }
    
    setError("Attestation retrieval timed out");
    addLog("Error: Attestation retrieval timed out after maximum attempts");
    throw new Error("Failed to retrieve attestation after maximum attempts");
  };

  // Retrieve a reference to viem chains by chain ID
  const getChainConfig = useCallback((chainId: SupportedChainId) => {
    // 首先檢查 wagmi 配置中的鏈
    const wagmiChainConfig = wagmiChains[chainId as keyof typeof wagmiChains] as Chain | undefined;
    if (wagmiChainConfig) {
      return wagmiChainConfig;
    }
    
    // 如果 wagmi 配置中沒有，檢查本地定義的鏈
    const localChainConfig = allChains[chainId as keyof typeof allChains];
    if (localChainConfig) {
      return localChainConfig;
    }
    
    return undefined;
  }, [wagmiChains]);

  // Execute the cross-chain transfer
  const executeTransfer = useCallback(async () => {
    if (!address) {
      const err = new Error("No connected wallet");
      setError(err.message);
      setIsError(true);
      throw err;
    }

    if (!walletClient) {
        const err = new Error("Wallet client is not available.");
        setError(err.message);
        setIsError(true);
        throw err;
    }

    if (!Object.values(SupportedChainId).includes(sourceChainId)) {
      const err = new Error(`不支援的來源鏈 ID: ${sourceChainId}`);
      setError(err.message);
      setIsError(true);
      throw err;
    }
    if (!Object.values(SupportedChainId).includes(destinationChainId)) {
      const err = new Error(`不支援的目標鏈 ID: ${destinationChainId}`);
      setError(err.message);
      setIsError(true);
      throw err;
    }

    setIsLoading(true);
    setIsError(false);
    setError(null);
    setIsSuccess(false);
    setCurrentStep("idle");

    try {
      if (chain?.id !== sourceChainId) {
        if (switchChain) {
          await switchChain({ chainId: sourceChainId });
          addLog(`Switched network to ${sourceChainId}`);
        } else {
          throw new Error("Wallet does not support network switching");
        }
      }

      const numericAmount = parseUnits(amount, DEFAULT_DECIMALS);
      const destAddress = destinationAddress || address;

    //   await approveUSDC();
      const burnTx = await burnUSDC(
          walletClient,
          sourceChainId,
          numericAmount,
          destinationChainId,
          destAddress,
          transferType
      );
      const attestation = await retrieveAttestation(burnTx, sourceChainId);
      
      setCurrentStep("completed");
      setIsSuccess(true);
      return attestation;
    } catch (err) {
      setCurrentStep("error");
      setIsError(true);
      
      if (err instanceof Error) {
        setError(err.message);
        addLog(`Error: ${err.message}`);
      } else {
        setError("Unknown error occurred");
        addLog("Error: Unknown error occurred");
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [
    address,
    chain,
    walletClient,
    sourceChainId,
    destinationChainId,
    amount,
    destinationAddress,
    transferType,
    switchChain,
    // approveUSDC,
    addLog,
    wagmiChains
  ]);

  const reset = useCallback(() => {
    setCurrentStep("idle");
    setLogs([]);
    setError(null);
    setIsLoading(false);
    setIsSuccess(false);
    setIsError(false);
  }, []);

  return {
    currentStep,
    logs,
    error,
    executeTransfer,
    getBalance,
    reset,
    isLoading,
    isSuccess,
    isError,
  };
}
