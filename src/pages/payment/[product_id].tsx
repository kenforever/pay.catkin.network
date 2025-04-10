"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/router"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount, useContractRead, useWriteContract, useSwitchChain } from "wagmi"
import { NetworkEnum } from "@1inch/cross-chain-sdk"
import { motion, AnimatePresence } from "framer-motion"
import useFusionPlusTransfer from "../../hooks/use-fusion-plus-transfer"
import { useCCTPTransfer } from "../../hooks/use-CCTP-transfer"
import Head from "next/head"
import Image from "next/image"
import { parseUnits, formatUnits, erc20Abi } from "viem"
import tokenData from "./support_token_list.json" // Import token data from JSON

// Constants
const INCH_AGGREGATOR_ADDRESS = "0x111111125421cA6dc452d289314280a0f8842A65" // Replace with actual 1inch aggregator address
const CCTP_CONTRACT_ADDRESS = "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d" // CCTP contract address

// Types
interface Product {
  id: string
  title: string
  description: string
  price: string // in USD
  image: string
  network?: string
  owner?: string
  token_address?: `0x${string}`
}

interface Token {
  symbol: string
  name: string
  address: `0x${string}`
  decimals: number
  logoURI: string
}

interface Chain {
  id: number
  name: string
  networkEnum: NetworkEnum
}

// Define type for the imported JSON data structure
type TokenData = {
  [chainName: string]: {
    [tokenSymbol: string]: {
      address: `0x${string}`
      decimals: number
      poolid: number // Assuming poolid exists, though not used in Token interface directly
    }
  }
}

// Available chains
const availableChains: Chain[] = [
  { id: 1, name: "Ethereum", networkEnum: NetworkEnum.ETHEREUM },
  { id: 137, name: "Polygon", networkEnum: NetworkEnum.POLYGON },
  { id: 56, name: "Binance Smart Chain", networkEnum: NetworkEnum.BINANCE },
  { id: 10, name: "Optimism", networkEnum: NetworkEnum.OPTIMISM },
  { id: 42161, name: "Arbitrum", networkEnum: NetworkEnum.ARBITRUM },
  { id: 8453, name: "Base", networkEnum: NetworkEnum.COINBASE },
  { id: 43114, name: "Avalanche", networkEnum: NetworkEnum.AVALANCHE },
  { id: 59144, name: "Linea", networkEnum: NetworkEnum.LINEA },
]

// CCTP 支持的鏈 ID 列表
const CCTP_SUPPORTED_CHAINS = [1, 43114, 8453, 59144]; // Ethereum, Avalanche, Base, Linea

// USDC 地址映射 (各鏈上的 USDC 合約地址)
const USDC_ADDRESSES: {[chainId: number]: `0x${string}`} = {
  1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // Ethereum
  43114: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", // Avalanche
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base
  59144: "0x176211869cA2b568f2A7D4EE941E073a821EE1ff", // Linea
};

// Payment steps
enum PaymentStep {
  PRODUCT_INFO = "PRODUCT_INFO",
  PAYMENT_OPTIONS = "PAYMENT_OPTIONS",
  ALLOWANCE_CHECK = "ALLOWANCE_CHECK",
  TRANSFER_PROCESS = "TRANSFER_PROCESS",
  TRANSACTION_SUBMISSION = "TRANSACTION_SUBMISSION",
  TRANSACTION_RESULT = "TRANSACTION_RESULT",
}

// Helper function to extract numeric value from price string
// Assumes priceString will only contain an integer string if valid.
const getNumericPrice = (priceString: string | undefined | null): string => {
  console.log("getNumericPrice input (expecting integer string):", priceString);
  if (!priceString) {
    console.log("getNumericPrice: Input is null or undefined, returning '0'");
    return "0";
  }
  try {
    // Attempt to parse the input string directly as a floating point number
    const numericValue = parseFloat(priceString);

    // Check if the parsing resulted in a valid number (not NaN)
    if (!isNaN(numericValue)) {
      console.log("getNumericPrice: Parsed valid number:", numericValue);
      // Convert the number back to a string for consistency
      return String(numericValue);
    } else {
      // If parsing fails (e.g., input was not a number string like "abc")
      console.warn("getNumericPrice: Input could not be parsed as a number, returning '0' for input:", priceString);
      return "0";
    }

  } catch (e) {
    // Catch any unexpected errors during parsing
    console.error("getNumericPrice: Error parsing price:", priceString, e);
    return "0";
  }
};

const PaymentPage = () => {
  const router = useRouter()
  const { product_id } = router.query

  // State
  const [currentStep, setCurrentStep] = useState<PaymentStep>(PaymentStep.PRODUCT_INFO)
  const [product, setProduct] = useState<Product | null>(null)
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null)
  const [selectedToken, setSelectedToken] = useState<Token | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [chainTokens, setChainTokens] = useState<Token[]>([]) // State for tokens of the selected chain
  const [useCCTP, setUseCCTP] = useState(false) // 是否使用 CCTP 轉賬

  // Wagmi hooks
  const { address, isConnected, chain } = useAccount()
  const { switchChain } = useSwitchChain()

  // Processed numeric price state or variable
  const numericPrice = getNumericPrice(product?.price);

  // Fetch product info
  useEffect(() => {
    if (product_id) {
      setIsLoading(true)
      fetch(`http://localhost:8000/product/product/${product_id}`)
        .then((res) => res.json())
        .then((data: Product & { network?: string; token_address?: `0x${string}` }) => {
          setProduct(data)
          setIsLoading(false)
        })
        .catch((err) => {
          console.error("Error fetching product:", err)
          setError("Failed to load product information")
          setIsLoading(false)
        })
    }
  }, [product_id])

  // Define the mapping from network name string to NetworkEnum
  const networkNameToEnumMap: { [key: string]: NetworkEnum } = {
    "Ethereum": NetworkEnum.ETHEREUM,
    "Polygon": NetworkEnum.POLYGON,
    "Binance Smart Chain": NetworkEnum.BINANCE,
    "Optimism": NetworkEnum.OPTIMISM,
    "Arbitrum": NetworkEnum.ARBITRUM,
    "Base": NetworkEnum.COINBASE,
    "Avalanche": NetworkEnum.AVALANCHE,
    "Linea": NetworkEnum.LINEA,
    // Add other mappings if needed
  };

  // Check token allowance
  console.log("selectedToken", selectedToken)
  console.log("selectedChain", selectedChain)
  const { data: allowance, refetch: refetchAllowance, isLoading: isAllowanceLoading } = useContractRead({
    address: selectedToken?.address,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address as `0x${string}`, useCCTP ? CCTP_CONTRACT_ADDRESS as `0x${string}` : INCH_AGGREGATOR_ADDRESS as `0x${string}`],
  })

  console.log("allowance", allowance)

  // Approve token spending
  const {
    writeContract: approveToken,
    isPending: isApproving,
    isSuccess: isApproveSuccess,
  } = useWriteContract()

  // 檢查是否可以使用 CCTP
  const checkCCTPEligibility = useCallback(() => {
    if (!selectedChain || !selectedToken || !product?.network) return false;
    
    // 獲取目標鏈 ID
    const dstChainId = availableChains.find(c => c.name === product.network)?.id;
    if (!dstChainId) return false;
    
    // 檢查源鏈和目標鏈是否都支持 CCTP
    const isSrcChainSupported = CCTP_SUPPORTED_CHAINS.includes(selectedChain.id);
    const isDstChainSupported = CCTP_SUPPORTED_CHAINS.includes(dstChainId);
    
    // 檢查是否為 USDC 代幣
    const isUSDC = selectedToken.symbol === "USDC";
    
    return isSrcChainSupported && isDstChainSupported && isUSDC;
  }, [selectedChain, selectedToken, product]);
  
  // 在選擇代幣或鏈變更時更新 CCTP 狀態
  useEffect(() => {
    setUseCCTP(checkCCTPEligibility());
  }, [selectedChain, selectedToken, product, checkCCTPEligibility]);
  
  // Transfer hook for FusionPlus
  const {
    transfer: fusionTransfer,
    isLoading: isFusionLoading,
    isSuccess: isFusionSuccess,
    isError: isFusionError,
    error: fusionError,
    txHash: fusionTxHash,
  } = useFusionPlusTransfer({
    // Use the processed numericPrice for amount calculation
    amount: parseUnits(numericPrice, selectedToken?.decimals || 18).toString(),
    // Use the mapping and product.network to set dstChainId
    // Default to ETHEREUM if product or network is unavailable or not mapped
    dstChainId: networkNameToEnumMap[product?.network || ""] || NetworkEnum.ETHEREUM,
    dstAddress: product?.owner || address as `0x${string}`,
    srcTokenAddress: selectedToken?.address || "0x6b175474e89094c44da98b954eedeac495271d0f", // Consider if this needs adjustment based on selectedChain
    dstTokenAddress: product?.token_address || "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", // Use token_address from product, fallback to native token
  })

  // 獲取目標鏈 ID
  const getDstChainId = useCallback(() => {
    if (!product?.network) return 1; // 默認為 Ethereum
    const chain = availableChains.find(c => c.name === product.network);
    return chain?.id || 1;
  }, [product]);

  // Transfer hook for CCTP
  const {
    executeTransfer: cctpTransfer,
    isLoading: isCCTPLoading,
    isSuccess: isCCTPSuccess,
    isError: isCCTPError,
    error: cctpError,
  } = useCCTPTransfer({
    amount: numericPrice,
    sourceChainId: selectedChain?.id || 1,
    destinationChainId: getDstChainId(),
    destinationAddress: product?.owner as `0x${string}` || address as `0x${string}`,
    transferType: "fast",
  });

  // 統一轉賬狀態
  const isTransferLoading = useCCTP ? isCCTPLoading : isFusionLoading;
  const isTransferSuccess = useCCTP ? isCCTPSuccess : isFusionSuccess;
  const isTransferError = useCCTP ? isCCTPError : isFusionError;
  const transferError = useCCTP ? cctpError : fusionError;
  const transferTxHash = useCCTP ? "cctp-transfer" : fusionTxHash;

  // 統一轉賬函數
  const transfer = async () => {
    if (useCCTP) {
      try {
        const attestationData = await cctpTransfer();
        // 提取 CCTP attestation 數據並設置 txHash
        if (attestationData?.attestation) {
          // 使用 transactionHash 作為 txHash，但保存完整的 attestation 數據
          setTxHash(attestationData.transactionHash);
          // 保存完整的 attestation 數據，用於發送到後端
          window.localStorage.setItem('cctp_attestation', JSON.stringify(attestationData));
        } else {
          setTxHash("cctp-transfer-success");
        }
        return true;
      } catch (err) {
        console.error("CCTP transfer failed:", err);
        return false;
      }
    } else {
      return fusionTransfer();
    }
  };

  // Effect to handle allowance approval success
  useEffect(() => {
    if (isApproveSuccess && currentStep === PaymentStep.ALLOWANCE_CHECK) {
      refetchAllowance().then(() => {
        setCurrentStep(PaymentStep.TRANSFER_PROCESS)
      })
    }
  }, [isApproveSuccess, currentStep, refetchAllowance])

  // Effect to handle transfer success
  useEffect(() => {
    if (isTransferSuccess && (transferTxHash || txHash)) {
      // 使用已存在的 txHash 或從 transfer 結果獲取的 transferTxHash
      const finalTxHash = txHash || transferTxHash;
      setTxHash(finalTxHash);
      
      // 關閉加載狀態
      setIsLoading(false);
      
      // 立即轉到交易提交頁面
      setCurrentStep(PaymentStep.TRANSACTION_SUBMISSION);

      // 組裝發送到後端的數據
      // 定義具有擴展屬性的類型
      type TxData = {
        tx_id: string;
        product_id: string | string[] | undefined;
        attestation?: string;
        message?: string;
        status?: string;
        sourceChainId?: number;
        [key: string]: any; // 允許添加其他屬性
      };

      // 確保 finalTxHash 不為 null
      if (finalTxHash) {
        let txData: TxData = {
          tx_id: finalTxHash,
          product_id,
        };

        // 如果是 CCTP 轉賬，從本地存儲獲取 attestation 數據
        if (useCCTP) {
          const storedAttestation = window.localStorage.getItem('cctp_attestation');
          if (storedAttestation) {
            try {
              const attestationData = JSON.parse(storedAttestation);
              txData = {
                ...txData,
                attestation: attestationData.attestation,
                sourceChainId: attestationData.sourceChainId,
              };
            } catch (e) {
              console.error("Failed to parse stored attestation data:", e);
            }
          }
        }

        // Submit transaction ID to backend
        fetch("http://localhost:8000/tx/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(txData),
        })
          .then((res) => res.json())
          .then(() => {
            setCurrentStep(PaymentStep.TRANSACTION_RESULT)
          })
          .catch((err) => {
            console.error("Error submitting transaction:", err)
            setError("Failed to submit transaction to server")
            setCurrentStep(PaymentStep.TRANSACTION_RESULT)
          })
      } else {
        console.error("Transaction hash is null, cannot submit to server");
        setError("Failed to get transaction hash");
        setCurrentStep(PaymentStep.TRANSACTION_RESULT);
      }
    }
  }, [isTransferSuccess, transferTxHash, product_id, useCCTP, txHash])

  // Effect to handle transfer error
  useEffect(() => {
    if (isTransferError && transferError) {
      // 確保在錯誤情況下關閉加載狀態
      setIsLoading(false);
      setError(transferError instanceof Error ? transferError.message : "Unknown transfer error")
      setCurrentStep(PaymentStep.TRANSACTION_RESULT)
    }
  }, [isTransferError, transferError])

  // Handle chain selection
  const handleChainSelect = (chainOption: Chain) => {
    setSelectedChain(chainOption)
    setSelectedToken(null) // Reset selected token when chain changes
    if (chain?.id !== chainOption.id) {
      switchChain?.({ chainId: chainOption.id })
    }

    // Map chain name from availableChains to keys in tokenData.json
    let jsonChainKey = chainOption.name
    if (chainOption.name === "Binance Smart Chain") {
      jsonChainKey = "BSC" // Handle name mismatch
    }

    // Cast imported JSON to the defined type
    const typedTokenData = tokenData as TokenData

    // Get tokens for the selected chain from the imported data
    const tokensForChain = typedTokenData[jsonChainKey]

    if (tokensForChain) {
      const formattedTokens: Token[] = Object.entries(tokensForChain).map(
        ([symbol, details]) => ({
          symbol: symbol.toUpperCase(),
          name: symbol.toUpperCase(), // Use symbol as name for now
          address: details.address,
          decimals: details.decimals,
          logoURI: `/${symbol.toLowerCase()}-logo.png`, // Generate placeholder logo URI
        })
      )
      // Add ETH for Ethereum chain if needed (or handle native tokens appropriately)
      // For simplicity, let's assume native ETH isn't in the JSON and needs special handling
      // or is added separately if required by the logic further down.
      // Currently, the logic checks for ETH address explicitly later.

      setChainTokens(formattedTokens)
    } else {
      setChainTokens([]) // Set empty array if no tokens found for the chain
    }
  }

  // Handle token selection
  const handleTokenSelect = (token: Token) => {
    setSelectedToken(token)
  }

  // Handle payment confirmation
  const handleConfirmPayment = async () => {
    if (!selectedToken || !selectedChain) return

    // For ETH, no allowance check needed, proceed directly to transfer
    if (selectedToken.address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
      console.log("Native token selected, skipping allowance check.")
      setCurrentStep(PaymentStep.TRANSFER_PROCESS)
      return
    }

    // For ERC20 tokens, check allowance first
    console.log("ERC20 token selected, checking allowance...")
    setIsLoading(true) // Show loading indicator while checking allowance
    setError(null)

    try {
      // Refetch the latest allowance
      const { data: currentAllowance } = await refetchAllowance()
      console.log("Refetched allowance:", currentAllowance)

      // Calculate the required amount in the token's smallest unit (BigInt)
      const requiredAmount = parseUnits(numericPrice, selectedToken.decimals)
      console.log("Required amount (BigInt):", requiredAmount)

      // Compare allowance with required amount (handle potential undefined allowance)
      if (currentAllowance !== undefined && currentAllowance !== null && currentAllowance >= requiredAmount) {
        console.log("Allowance is sufficient, skipping approval step.")
        setCurrentStep(PaymentStep.TRANSFER_PROCESS)
      } else {
        console.log("Allowance is insufficient or not found, proceeding to approval step.")
        setCurrentStep(PaymentStep.ALLOWANCE_CHECK)
      }
    } catch (err) {
      console.error("Error checking allowance:", err)
      setError("Failed to check token allowance. Please try again.")
      // Optionally stay on the current step or move to an error state
    } finally {
      setIsLoading(false)
    }

    // console.log("numericPrice", numericPrice)
    // console.log("product price", product?.price)
    // The old logic is replaced by the checks above
    // setCurrentStep(PaymentStep.ALLOWANCE_CHECK)
    // await refetchAllowance()
  }

  // Handle transfer execution
  const handleExecuteTransfer = async () => {
    if (!product?.price || !selectedToken) {
      setError("Product price or token details missing.");
      setCurrentStep(PaymentStep.TRANSACTION_RESULT);
      return;
    }
    try {
      // 在開始轉賬前設置加載狀態
      setIsLoading(true);
      await transfer();
      // 轉賬成功後不必立即關閉加載狀態，因為還需要等待交易確認
      // 轉到下一步時會顯示其他加載指示器
    } catch (err) {
      console.error("Transfer failed:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred during transfer");
      setCurrentStep(PaymentStep.TRANSACTION_RESULT);
      // 確保錯誤時關閉加載狀態
    } finally {
        setIsLoading(false);
      }
        
}

  // Handle retry
  const handleRetry = () => {
    setError(null)
    setTxHash(null)
    setCurrentStep(PaymentStep.PRODUCT_INFO)
  }

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, x: 100 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: -100 },
  }

  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.5,
  }

  // 判斷鏈是否支持 CCTP
  const isChainCCTPSupported = (chainId: number) => CCTP_SUPPORTED_CHAINS.includes(chainId);

  // Render product info step
  const renderProductInfo = () => (
    <motion.div
      key="product-info"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full"
    >
      <h2 className="text-2xl font-bold mb-4">Product Details</h2>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : product ? (
        <div className="space-y-4">
          {product.image && (
            <div className="relative h-48 w-full">
              <Image
                src={product.image || "/placeholder.svg"}
                alt={product.title}
                layout="fill"
                objectFit="cover"
                className="rounded-md"
              />
            </div>
          )}
          <h3 className="text-xl font-semibold">{product.title}</h3>
          <p className="text-gray-600">{product.description}</p>
          <div className="text-2xl font-bold text-blue-600">{product.price} USDC</div>

          {/* Keep Proceed button, disable if not connected, remove old ConnectButton logic */}
          <button
            onClick={() => setCurrentStep(PaymentStep.PAYMENT_OPTIONS)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!isConnected}
          >
            Proceed to Payment
          </button>
        </div>
      ) : (
        <div className="text-red-500">{error || "Product not found"}</div>
      )}
    </motion.div>
  )

  // Render payment options step
  const renderPaymentOptions = () => (
    <motion.div
      key="payment-options"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full"
    >
      <h2 className="text-2xl font-bold mb-4">Payment Options</h2>

      <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Select Blockchain</h3>
            <div className="grid grid-cols-2 gap-2">
              {availableChains.map((chainOption) => (
                <button
                  key={chainOption.id}
                  onClick={() => handleChainSelect(chainOption)}
                  className={`p-3 border rounded-md text-center transition-colors relative ${
                    selectedChain?.id === chainOption.id
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 hover:border-blue-300"
                  }`}
                >
                  {chainOption.name}
                  {isChainCCTPSupported(chainOption.id) && (
                    <span className="absolute top-0 right-0 -mt-2 -mr-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      快速
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {selectedChain && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Select Token</h3>
              <div className="space-y-2">
                {/* Iterate over chainTokens state */}
                {chainTokens.length > 0 ? (
                  chainTokens.map((token) => (
                    <button
                      key={token.address}
                      onClick={() => handleTokenSelect(token)}
                      className={`w-full flex items-center p-3 border rounded-md transition-colors relative ${
                        selectedToken?.address === token.address
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-300 hover:border-blue-300"
                      }`}
                    >
                      <div className="flex-1 text-left mx-12">
                        <div className="font-medium">{token.symbol}</div>
                        {/* <div className="text-xs text-gray-500">{token.name}</div> */}
                      </div>
                      {token.symbol === "USDC" && isChainCCTPSupported(selectedChain.id) && (
                        <span className="absolute top-0 right-0 -mt-2 -mr-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                          快速
                        </span>
                      )}
                    </button>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No supported tokens found for this chain.</p>
                )}
                {/* Consider adding ETH/Native token option manually if needed */}
                {selectedChain?.id === 1 && ( // Example: Manually add ETH for Ethereum
                   <button
                     onClick={() => handleTokenSelect({
                       symbol: "ETH",
                       name: "Ethereum",
                       address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                       decimals: 18,
                       logoURI: "/eth-logo.png",
                     })}
                     className={`w-full flex items-center p-3 border rounded-md transition-colors ${
                       selectedToken?.address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
                         ? "border-blue-500 bg-blue-50 text-blue-700"
                         : "border-gray-300 hover:border-blue-300"
                     }`}
                   >
                     <div className="w-8 h-8 relative mr-2">
                       <Image
                         src={"/eth-logo.png"}
                         alt={"ETH"}
                         layout="fill"
                         className="rounded-full"
                       />
                     </div>
                     <div className="flex-1 text-left">
                       <div className="font-medium">ETH</div>
                       <div className="text-xs text-gray-500">Ethereum</div>
                     </div>
                   </button>
                 )}
                 
                 {/* 手動添加 USDC 代幣，如果目前選定的鏈支持 CCTP 但 chainTokens 中沒有 USDC */}
                 {isChainCCTPSupported(selectedChain.id) && !chainTokens.some(token => token.symbol === "USDC") && (
                   <button
                     onClick={() => handleTokenSelect({
                       symbol: "USDC",
                       name: "USD Coin",
                       address: USDC_ADDRESSES[selectedChain.id] || "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                       decimals: 6,
                       logoURI: "/usdc-logo.png",
                     })}
                     className={`w-full flex items-center p-3 border rounded-md transition-colors relative ${
                       selectedToken?.symbol === "USDC"
                         ? "border-blue-500 bg-blue-50 text-blue-700"
                         : "border-gray-300 hover:border-blue-300"
                     }`}
                   >
                     <div className="w-8 h-8 relative mr-2">
                       <Image
                         src={"/usdc-logo.png"}
                         alt={"USDC"}
                         layout="fill"
                         className="rounded-full"
                       />
                     </div>
                     <div className="flex-1 text-left">
                       <div className="font-medium">USDC</div>
                       <div className="text-xs text-gray-500">USD Coin</div>
                     </div>
                     <span className="absolute top-0 right-0 -mt-2 -mr-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                       快速
                     </span>
                   </button>
                 )}
              </div>
            </div>
          )}

          {selectedChain && selectedToken && (
            <button
              onClick={handleConfirmPayment}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Continue
            </button>
          )}

          <button
            onClick={() => setCurrentStep(PaymentStep.PRODUCT_INFO)}
            className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
          >
            Back
          </button>
        </div>
    </motion.div>
  )

  // Render allowance check step
  const renderAllowanceCheck = () => (
    <motion.div
      key="allowance-check"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full"
    >
      <h2 className="text-2xl font-bold mb-4">Token Approval</h2>

      <div className="space-y-4">
        <p className="text-gray-600">
          To proceed with the payment, you need to approve the 1inch aggregator to use your {selectedToken?.symbol}.
        </p>

        {/* Check if product and token are selected before showing details */}
        {product?.price && selectedToken ? (
          <div className="bg-gray-100 p-4 rounded-md">
            <div className="flex justify-between">
              <span>Current allowance:</span>
              <span>
                {isAllowanceLoading ? ( // Check if allowance is loading
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 inline-block"></div>
                ) : (
                  // Display 0 if allowance is undefined/null, otherwise format it
                  `${allowance !== undefined && allowance !== null ? formatUnits(allowance, selectedToken.decimals) : '0'} ${selectedToken.symbol}`
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Required amount:</span>
              <span>
                {/* Display the original product price string here, formatting is for calculation only */}
                {/* Using numericPrice as it's used for the actual approval amount */}
                {product?.price} {selectedToken.symbol}
              </span>
            </div>
          </div>
        ) : (
          // Optional: Show a message if product/token are not ready yet
          <div className="flex justify-center items-center h-20">
             <p className="text-gray-500">Loading payment details...</p>
          </div>
        )}

        <button
          onClick={() => {
            // Use the processed numericPrice when calling approveToken
            if (selectedToken && product?.price !== "0") {
              approveToken({
                address: selectedToken.address,
                abi: erc20Abi,
                functionName: "approve",
                args: [useCCTP ? CCTP_CONTRACT_ADDRESS as `0x${string}` : INCH_AGGREGATOR_ADDRESS as `0x${string}`, parseUnits(numericPrice, selectedToken.decimals)],
              })
              console.log("approveToken", approveToken)
            }
          }}
          disabled={isApproving || numericPrice === "0"} // Also disable if price is invalid
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400"
        >
          {isApproving ? "Approving..." : "Approve Token"}
        </button>

        <button
          onClick={() => setCurrentStep(PaymentStep.PAYMENT_OPTIONS)}
          className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
          disabled={isApproving}
        >
          Back
        </button>
      </div>
    </motion.div>
  )

  // Render transfer process step
  const renderTransferProcess = () => (
    <motion.div
      key="transfer-process"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full"
    >
      <h2 className="text-2xl font-bold mb-4">Complete Payment</h2>

      <div className="space-y-6">
        <div className="bg-gray-100 p-4 rounded-md space-y-2">
          <div className="flex justify-between">
            <span>Product:</span>
            <span>{product?.title}</span>
          </div>
          <div className="flex justify-between">
            <span>Amount:</span>
            <span>${product?.price}</span>
          </div>
          <div className="flex justify-between">
            <span>Payment:</span>
            <span>
              {product?.price ? formatUnits(parseUnits(numericPrice, selectedToken?.decimals || 18), selectedToken?.decimals || 18) : 'N/A'} {selectedToken?.symbol} on {selectedChain?.name}
            </span>
          </div>
          {useCCTP && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center text-green-700">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
                <span className="text-sm font-medium">使用 CCTP 快速跨鏈轉賬</span>
              </div>
            </div>
          )}
        </div>

        {isTransferLoading ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-gray-600">Processing your payment...</p>
          </div>
        ) : (
          <button
            onClick={handleExecuteTransfer}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Confirm Payment
          </button>
        )}

        <button
          onClick={() => setCurrentStep(PaymentStep.PAYMENT_OPTIONS)}
          className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
          disabled={isTransferLoading}
        >
          Back
        </button>
      </div>
    </motion.div>
  )

  // Render transaction submission step
  const renderTransactionSubmission = () => (
    <motion.div
      key="transaction-submission"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full"
    >
      <h2 className="text-2xl font-bold mb-4">Processing Payment</h2>

      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-blue-600 rounded-full animate-spin"></div>
        </div>

        <p className="text-center text-gray-600">
          Your transaction has been submitted and is being processed.
          <br />
          Please wait a moment...
        </p>

        {txHash && (
          <div className="w-full bg-gray-100 p-3 rounded-md overflow-hidden">
            <p className="font-medium text-sm">Transaction Hash:</p>
            <p className="text-xs text-gray-500 truncate">{txHash}</p>
          </div>
        )}
      </div>
    </motion.div>
  )

  // Render transaction result step
  const renderTransactionResult = () => (
    <motion.div
      key="transaction-result"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full"
    >
      <h2 className="text-2xl font-bold mb-4">{error ? "Payment Failed" : "Payment Successful"}</h2>

      {error ? (
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
            <p className="font-medium">Error:</p>
            <p>{error}</p>
          </div>

          <button
            onClick={handleRetry}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <p className="text-center text-gray-600">Your payment has been processed successfully!</p>
          </div>

          {txHash && (
            <div className="bg-gray-100 p-4 rounded-md space-y-2">
              <p className="font-medium">Transaction Details:</p>
              <div className="flex justify-between">
                <span>Product:</span>
                <span>{product?.title}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount:</span>
                <span>${product?.price}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment:</span>
                <span>
                  {product?.price ? formatUnits(parseUnits(numericPrice, selectedToken?.decimals || 18), selectedToken?.decimals || 18) : 'N/A'} {selectedToken?.symbol} on {selectedChain?.name}
                </span>
              </div>
              <div className="pt-2">
                <p className="text-xs text-gray-500 break-all">
                  <span className="font-medium">TX Hash:</span> {txHash}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={() => router.push("/")}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Return Home
          </button>
        </div>
      )}
    </motion.div>
  )

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case PaymentStep.PRODUCT_INFO:
        return renderProductInfo()
      case PaymentStep.PAYMENT_OPTIONS:
        return renderPaymentOptions()
      case PaymentStep.ALLOWANCE_CHECK:
        return renderAllowanceCheck()
      case PaymentStep.TRANSFER_PROCESS:
        return renderTransferProcess()
      case PaymentStep.TRANSACTION_SUBMISSION:
        return renderTransactionSubmission()
      case PaymentStep.TRANSACTION_RESULT:
        return renderTransactionResult()
      default:
        return renderProductInfo()
    }
  }

  return (
    <>
      <Head>
        <title>{product ? `Pay for ${product.title}` : "Payment Gateway"}</title>
        <meta name="description" content="Catkin Network Payment Gateway" />
      </Head>

      <div className="min-h-screen bg-gray-100 flex flex-col">
        <header className="bg-white shadow-sm py-4">
          {/* Updated header with flex layout and ConnectButton */}
          <div className="container mx-auto px-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800">Catkin Network Payment</h1>
            <ConnectButton />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          {/* Ensure AnimatePresence and renderCurrentStep call remain */}
          <AnimatePresence mode="wait">{renderCurrentStep()}</AnimatePresence>
        </main>

        <footer className="bg-white py-4 border-t">
          <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Catkin Network. All rights reserved.
          </div>
        </footer>
      </div>
    </>
  )
}

export default PaymentPage

