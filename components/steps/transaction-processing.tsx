"use client"

import { useEffect, useState, useRef } from "react"
import { Card } from "@/components/ui/card"
import type { PaymentDetails } from "../payment-flow"
import { useCrossChainTransfer } from "@/lib/use-cross-chain-transfer"
import { useFusionTransfer } from "@/lib/use-fusion-transfer"
import { CHAIN_NAME_TO_ID } from "@/lib/chains"
import anime from "animejs"


interface TransactionProcessingProps {
  paymentDetails: PaymentDetails
  paymentMethod: "cctp" | "1inch"
  onNext: () => void
  setTxHash: (hash: string) => void
}

export default function TransactionProcessing({
  paymentDetails,
  paymentMethod,
  onNext,
  setTxHash,
}: TransactionProcessingProps) {
  const [isProcessing, setIsProcessing] = useState(true)
  const [selectedTokenInfo, setSelectedTokenInfo] = useState<any>(null)
  const animationRef = useRef<HTMLDivElement>(null)
  const { executeTransfer, logs: cctpLogs } = useCrossChainTransfer()
  const { executeFusionTransfer, logs: fusionLogs, txHash: fusionTxHash } = useFusionTransfer()
  const [logs, setLogs] = useState<string[]>([])


  // if (paymentMethod === "cctp") {
    











  useEffect(() => {
    // Fetch token info for display
    const fetchTokenInfo = async () => {
      try {
        const response = await fetch("https://tokens.coingecko.com/uniswap/all.json")
        if (!response.ok) {
          throw new Error("Failed to fetch token list")
        }
        const data = await response.json()
        const tokenInfo = data.tokens.find((token: any) => token.address === paymentDetails.selectedToken)
        setSelectedTokenInfo(tokenInfo)
      } catch (error) {
        console.error("Error fetching token info:", error)
      }
    }

    if (paymentDetails.selectedToken) {
      fetchTokenInfo()
    }
  }, [paymentDetails.selectedToken])

  useEffect(() => {
    // Update logs from the appropriate transfer method
    if (paymentMethod === "cctp") {
      setLogs(cctpLogs)
    } else {
      setLogs(fusionLogs)
    }
  }, [cctpLogs, fusionLogs, paymentMethod])

  useEffect(() => {
    const processTransaction = async () => {
      try {
        // For demo purposes, we'll simulate the transaction
        // In a real implementation, you would use the actual private key and token addresses

        if (paymentMethod === "cctp") {
          // Simulate CCTP transfer
          const mockPrivateKey = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
          const sourceChainId = CHAIN_NAME_TO_ID[paymentDetails.selectedChain]
          const destinationChainId = CHAIN_NAME_TO_ID[paymentDetails.selectedChain] // Same chain for demo

          // In a real implementation, you would execute the actual transfer
          // await executeTransfer(mockPrivateKey, sourceChainId, destinationChainId, paymentDetails.amount.toString(), "fast");

          // For demo, we'll simulate the process
          await new Promise((resolve) => setTimeout(resolve, 3000))
        } else {
          // Simulate 1inch Fusion transfer
          const mockPrivateKey = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
          const mockNodeUrl = "https://mainnet.infura.io/v3/your-project-id"
          const mockAuthKey = "your-1inch-auth-key"

          // In a real implementation, you would execute the actual transfer
          // await executeFusionTransfer(
          //   mockPrivateKey,
          //   paymentDetails.selectedChain,
          //   paymentDetails.selectedChain, // Same chain for demo
          //   paymentDetails.selectedToken,
          //   paymentDetails.selectedToken, // Same token for demo
          //   paymentDetails.amount.toString(),
          //   mockAuthKey,
          //   mockNodeUrl
          // );

          // For demo, we'll simulate the process
          await new Promise((resolve) => setTimeout(resolve, 3000))
        }

        // Generate mock transaction hash
        const mockTxHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")

        setTxHash(mockTxHash)

        // Simulate API call to submit transaction
        await fetch("http://localhost/tx/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tx_id: mockTxHash }),
        })

        setIsProcessing(false)

        // Wait a bit to show the success animation before moving to next step
        setTimeout(() => {
          onNext()
        }, 1500)
      } catch (error) {
        console.error("Error processing transaction:", error)
        setIsProcessing(false)
      }
    }

    processTransaction()
  }, [onNext, setTxHash, paymentDetails, paymentMethod, executeTransfer, executeFusionTransfer])

  useEffect(() => {
    if (animationRef.current && isProcessing) {
      anime({
        targets: ".dot",
        translateY: [0, -15, 0],
        delay: anime.stagger(100),
        loop: true,
        easing: "easeInOutSine",
        duration: 1000,
      })
    }
  }, [isProcessing])

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Processing Transaction</h2>

      <Card className="p-6">
        <div className="flex flex-col items-center justify-center py-8">
          <div ref={animationRef} className="flex items-center justify-center gap-2 mb-6">
            <div className="dot w-4 h-4 bg-primary rounded-full"></div>
            <div className="dot w-4 h-4 bg-primary rounded-full"></div>
            <div className="dot w-4 h-4 bg-primary rounded-full"></div>
            <div className="dot w-4 h-4 bg-primary rounded-full"></div>
            <div className="dot w-4 h-4 bg-primary rounded-full"></div>
          </div>
          <h3 className="text-xl font-medium mb-2">
            {isProcessing ? `Processing Your ${paymentMethod.toUpperCase()} Payment` : "Transaction Submitted"}
          </h3>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            {isProcessing
              ? "Please wait while we process your transaction. This may take a few moments."
              : "Your transaction has been submitted to the blockchain. Moving to the next step..."}
          </p>

          {logs.length > 0 && (
            <div className="w-full max-w-md bg-muted/50 rounded-md p-3 h-32 overflow-y-auto text-xs font-mono">
              {logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

