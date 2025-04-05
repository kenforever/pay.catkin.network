"use client"

import { useState } from "react"
import {
  encodeFunctionData,
  type Hex,
  TransactionExecutionError,
  parseUnits,
  createPublicClient,
  formatUnits,
  parseEther,
  http,
} from "viem"
import axios from "axios"
import { sepolia, avalancheFuji, baseSepolia } from "viem/chains"
import {
  SupportedChainId,
  CHAIN_IDS_TO_USDC_ADDRESSES,
  CHAIN_IDS_TO_TOKEN_MESSENGER,
  CHAIN_IDS_TO_MESSAGE_TRANSMITTER,
  DESTINATION_DOMAINS,
} from "@/lib/chains"
import { useAccount, useWalletClient, useSwitchChain } from "wagmi"

export type TransferStep = "idle" | "approving" | "burning" | "waiting-attestation" | "minting" | "completed" | "error"

const chains = {
  [SupportedChainId.ETH_SEPOLIA]: sepolia,
  [SupportedChainId.AVAX_FUJI]: avalancheFuji,
  [SupportedChainId.BASE_SEPOLIA]: baseSepolia,
}

export function useCrossChainTransfer() {
  const [currentStep, setCurrentStep] = useState<TransferStep>("idle")
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { switchChain } = useSwitchChain()

  const DEFAULT_DECIMALS = 6

  const addLog = (message: string) => setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])

  const getPublicClient = (chainId: SupportedChainId) => {
    return createPublicClient({
      chain: chains[chainId],
      transport: http(),
    })
  }

  const getBalance = async (chainId: SupportedChainId) => {
    if (!address) return "0"

    const publicClient = getPublicClient(chainId)

    const balance = await publicClient.readContract({
      address: CHAIN_IDS_TO_USDC_ADDRESSES[chainId],
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
    })

    const formattedBalance = formatUnits(balance, DEFAULT_DECIMALS)

    return formattedBalance
  }

  const approveUSDC = async (sourceChainId: number) => {
    if (!walletClient || !address) {
      throw new Error("Wallet not connected")
    }

    setCurrentStep("approving")
    addLog("Approving USDC transfer...")

    try {
      // Ensure we're on the correct chain
      await switchChain({ chainId: sourceChainId })

      const tx = await walletClient.sendTransaction({
        to: CHAIN_IDS_TO_USDC_ADDRESSES[sourceChainId] as `0x${string}`,
        data: encodeFunctionData({
          abi: [
            {
              type: "function",
              name: "approve",
              stateMutability: "nonpayable",
              inputs: [
                { name: "spender", type: "address" },
                { name: "amount", type: "uint256" },
              ],
              outputs: [{ name: "", type: "bool" }],
            },
          ],
          functionName: "approve",
          args: [CHAIN_IDS_TO_TOKEN_MESSENGER[sourceChainId], 10000000000n],
        }),
      })

      addLog(`USDC Approval Tx: ${tx}`)
      setTxHash(tx)
      return tx
    } catch (err) {
      setError("Approval failed")
      throw err
    }
  }

  const burnUSDC = async (
    sourceChainId: number,
    amount: bigint,
    destinationChainId: number,
    transferType: "fast" | "standard",
  ) => {
    if (!walletClient || !address) {
      throw new Error("Wallet not connected")
    }

    setCurrentStep("burning")
    addLog("Burning USDC...")

    try {
      // Ensure we're on the correct chain
      await switchChain({ chainId: sourceChainId })

      const finalityThreshold = transferType === "fast" ? 1000 : 2000
      const maxFee = amount - 1n
      const mintRecipient = `0x${address.replace(/^0x/, "").padStart(64, "0")}`

      const tx = await walletClient.sendTransaction({
        to: CHAIN_IDS_TO_TOKEN_MESSENGER[sourceChainId] as `0x${string}`,
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
            DESTINATION_DOMAINS[destinationChainId],
            mintRecipient as Hex,
            CHAIN_IDS_TO_USDC_ADDRESSES[sourceChainId],
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            maxFee,
            finalityThreshold,
          ],
        }),
      })

      addLog(`Burn Tx: ${tx}`)
      setTxHash(tx)
      return tx
    } catch (err) {
      setError("Burn failed")
      throw err
    }
  }

  const retrieveAttestation = async (transactionHash: string, sourceChainId: number) => {
    setCurrentStep("waiting-attestation")
    addLog("Retrieving attestation...")

    const url = `https://iris-api-sandbox.circle.com/v2/messages/${DESTINATION_DOMAINS[sourceChainId]}?transactionHash=${transactionHash}`

    while (true) {
      try {
        const response = await axios.get(url)
        if (response.data?.messages?.[0]?.status === "complete") {
          addLog("Attestation retrieved!")
          return response.data.messages[0]
        }
        addLog("Waiting for attestation...")
        await new Promise((resolve) => setTimeout(resolve, 5000))
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          await new Promise((resolve) => setTimeout(resolve, 5000))
          continue
        }
        setError("Attestation retrieval failed")
        throw error
      }
    }
  }

  const mintUSDC = async (destinationChainId: number, attestation: any) => {
    if (!walletClient || !address) {
      throw new Error("Wallet not connected")
    }

    const MAX_RETRIES = 3
    let retries = 0
    setCurrentStep("minting")
    addLog("Minting USDC...")

    while (retries < MAX_RETRIES) {
      try {
        // Ensure we're on the correct chain
        await switchChain({ chainId: destinationChainId })

        const publicClient = getPublicClient(destinationChainId)
        const feeData = await publicClient.estimateFeesPerGas()
        const contractConfig = {
          address: CHAIN_IDS_TO_MESSAGE_TRANSMITTER[destinationChainId] as `0x${string}`,
          abi: [
            {
              type: "function",
              name: "receiveMessage",
              stateMutability: "nonpayable",
              inputs: [
                { name: "message", type: "bytes" },
                { name: "attestation", type: "bytes" },
              ],
              outputs: [],
            },
          ] as const,
        }

        // Estimate gas with buffer
        const gasEstimate = await publicClient.estimateContractGas({
          ...contractConfig,
          functionName: "receiveMessage",
          args: [attestation.message, attestation.attestation],
          account: address,
        })

        // Add 50% buffer to gas estimate
        const gasWithBuffer = (gasEstimate * 150n) / 100n
        addLog(`Gas Used: ${formatUnits(gasWithBuffer, 9)} Gwei`)

        const tx = await walletClient.sendTransaction({
          to: contractConfig.address,
          data: encodeFunctionData({
            ...contractConfig,
            functionName: "receiveMessage",
            args: [attestation.message, attestation.attestation],
          }),
          gas: gasWithBuffer,
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        })

        addLog(`Mint Tx: ${tx}`)
        setTxHash(tx)
        setCurrentStep("completed")
        break
      } catch (err) {
        if (err instanceof TransactionExecutionError && retries < MAX_RETRIES) {
          retries++
          addLog(`Retry ${retries}/${MAX_RETRIES}...`)
          await new Promise((resolve) => setTimeout(resolve, 2000 * retries))
          continue
        }
        throw err
      }
    }
  }

  const executeTransfer = async (
    sourceChainId: number,
    destinationChainId: number,
    amount: string,
    transferType: "fast" | "standard",
  ) => {
    try {
      if (!address || !walletClient) {
        throw new Error("Wallet not connected")
      }

      const numericAmount = parseUnits(amount, DEFAULT_DECIMALS)

      await approveUSDC(sourceChainId)
      const burnTx = await burnUSDC(sourceChainId, numericAmount, destinationChainId, transferType)
      const attestation = await retrieveAttestation(burnTx, sourceChainId)

      // Check if we have enough native token for gas on destination chain
      await switchChain({ chainId: destinationChainId })
      const publicClient = getPublicClient(destinationChainId)
      const balance = await publicClient.getBalance({ address })
      const minBalance = parseEther("0.01") // 0.01 native token

      if (balance < minBalance) {
        throw new Error("Insufficient native token for gas fees on destination chain")
      }

      await mintUSDC(destinationChainId, attestation)
    } catch (error) {
      setCurrentStep("error")
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      setError(errorMessage)
      addLog(`Error: ${errorMessage}`)
      throw error
    }
  }

  const reset = () => {
    setCurrentStep("idle")
    setLogs([])
    setError(null)
    setTxHash(null)
  }

  return {
    currentStep,
    logs,
    error,
    txHash,
    executeTransfer,
    getBalance,
    reset,
  }
}

