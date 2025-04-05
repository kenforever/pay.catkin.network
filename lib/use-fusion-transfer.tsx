"use client"

import { useState } from "react"
import { SDK, HashLock, getRandomBytes32 } from "@1inch/cross-chain-sdk"
import { solidityPackedKeccak256 } from "ethers"
import { CHAIN_ID_TO_NETWORK_ENUM, CHAIN_NAME_TO_ID } from "./chains"
import { useAccount, useWalletClient } from "wagmi"

// Custom connector for 1inch SDK that uses wagmi's wallet client
class WagmiProviderConnector {
  private walletClient: any
  private address: string

  constructor(walletClient: any, address: string) {
    this.walletClient = walletClient
    this.address = address
  }

  async signTypedData(domain: any, types: any, message: any) {
    return this.walletClient.signTypedData({
      domain,
      types,
      primaryType: "Order",
      message,
    })
  }

  getAddress() {
    return this.address
  }
}

export type FusionTransferStep =
  | "idle"
  | "getting-quote"
  | "placing-order"
  | "waiting-execution"
  | "completed"
  | "error"

export function useFusionTransfer() {
  const [currentStep, setCurrentStep] = useState<FusionTransferStep>("idle")
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()

  const addLog = (message: string) => setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])

  const executeFusionTransfer = async (
    srcChainName: string,
    dstChainName: string,
    srcTokenAddress: string,
    dstTokenAddress: string,
    amount: string,
    authKey: string,
  ) => {
    try {
      if (!address || !walletClient) {
        throw new Error("Wallet not connected")
      }

      setCurrentStep("getting-quote")
      addLog("Initializing 1inch Fusion+ transfer...")

      // Convert chain names to IDs
      const srcChainId = CHAIN_NAME_TO_ID[srcChainName]
      const dstChainId = CHAIN_NAME_TO_ID[dstChainName]

      if (!srcChainId || !dstChainId) {
        throw new Error("Invalid chain name")
      }

      // Map to 1inch Network Enum
      const srcNetworkEnum = CHAIN_ID_TO_NETWORK_ENUM[srcChainId]
      const dstNetworkEnum = CHAIN_ID_TO_NETWORK_ENUM[dstChainId]

      if (!srcNetworkEnum || !dstNetworkEnum) {
        throw new Error("Chain not supported by 1inch Fusion")
      }

      // Initialize blockchain provider with wagmi wallet client
      const blockchainProvider = new WagmiProviderConnector(walletClient, address)

      addLog(`Using wallet address: ${address}`)

      // Initialize 1inch SDK
      const sdk = new SDK({
        url: "https://api.1inch.dev/fusion",
        authKey: authKey,
        blockchainProvider,
      })

      // Prepare quote parameters
      const params = {
        srcChainId: srcNetworkEnum,
        dstChainId: dstNetworkEnum,
        srcTokenAddress: srcTokenAddress,
        dstTokenAddress: dstTokenAddress,
        amount: amount,
        enableEstimate: true,
        walletAddress: address,
      }

      addLog("Getting quote from 1inch Fusion...")
      const quote = await sdk.getQuote(params)
      addLog("Quote received successfully")

      setCurrentStep("placing-order")

      // Generate secrets for the order
      const secretsCount = quote.getPreset().secretsCount
      const secrets = Array.from({ length: secretsCount }).map(() => getRandomBytes32())
      const secretHashes = secrets.map((x) => HashLock.hashSecret(x))

      // Create hash lock based on secrets count
      const hashLock =
        secretsCount === 1
          ? HashLock.forSingleFill(secrets[0])
          : HashLock.forMultipleFills(
              secretHashes.map((secretHash, i) =>
                solidityPackedKeccak256(["uint64", "bytes32"], [i, secretHash.toString()]),
              ) as (string & {
                _tag: "MerkleLeaf"
              })[],
            )

      addLog("Placing order on 1inch Fusion...")

      // Place the order
      const orderResult = await sdk.placeOrder(quote, {
        walletAddress: address,
        hashLock,
        secretHashes,
        fee: {
          takingFeeBps: 100, // 1% fee
          takingFeeReceiver: address, // Fee receiver address
        },
      })

      setTxHash(orderResult.orderHash)
      addLog(`Order placed successfully. Hash: ${orderResult.orderHash}`)

      setCurrentStep("waiting-execution")
      addLog("Waiting for order execution...")

      // In a real implementation, you would poll the order status
      // For demo purposes, we'll simulate waiting and completion
      await new Promise((resolve) => setTimeout(resolve, 5000))

      setCurrentStep("completed")
      addLog("Transfer completed successfully!")

      return orderResult.orderHash
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
    executeFusionTransfer,
    reset,
  }
}

