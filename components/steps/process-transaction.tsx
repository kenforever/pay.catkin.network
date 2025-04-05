"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useAccount, useNetwork, useSwitchNetwork } from "wagmi"
import { useCrossChainTransfer } from "@/lib/use-cross-chain-transfer"
import { useFusionTransfer } from "@/lib/use-fusion-transfer"
import { CHAIN_NAME_TO_ID } from "@/lib/chains"
import type { PaymentDetails } from "../payment-flow"

interface ProcessTransactionProps {
  paymentDetails: PaymentDetails
  onNext: () => void
  onPrev: () => void
  setNeedsApproval: (needs: boolean) => void
  setPaymentMethod: (method: "cctp" | "1inch") => void
}

export default function ProcessTransaction({
  paymentDetails,
  onNext,
  onPrev,
  setNeedsApproval,
  setPaymentMethod,
}: ProcessTransactionProps) {
  const [selectedMethod, setSelectedMethod] = useState<"cctp" | "1inch">("cctp")
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedTokenInfo, setSelectedTokenInfo] = useState<any>(null)
  const { toast } = useToast()
  const { address } = useAccount()
  const { chain } = useNetwork()
  const { switchNetwork } = useSwitchNetwork()
  const { executeTransfer: executeCCTPTransfer, reset: resetCCTP } = useCrossChainTransfer()
  const { executeFusionTransfer, reset: resetFusion } = useFusionTransfer()

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

  // Reset transfer states when component mounts
  useEffect(() => {
    resetCCTP()
    resetFusion()
  }, [resetCCTP, resetFusion])

  const handleMethodChange = (value: "cctp" | "1inch") => {
    setSelectedMethod(value)
  }

  const handleContinue = async () => {
    try {
      setIsProcessing(true)
      setPaymentMethod(selectedMethod)

      // Check if we need to switch networks
      const targetChainId = CHAIN_NAME_TO_ID[paymentDetails.selectedChain]
      if (chain?.id !== targetChainId && switchNetwork) {
        await switchNetwork(targetChainId)
      }

      // For demo purposes, we'll simulate the approval check
      // In a real implementation, you would check the allowance
      const needsApproval = true
      setNeedsApproval(needsApproval)

      // Move to the next step (allowance)
      onNext()
    } catch (error) {
      console.error("Error processing transaction:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process transaction",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Choose Payment Method</h2>

      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Select how you want to process your payment</h3>
            <RadioGroup value={selectedMethod} onValueChange={handleMethodChange as (value: string) => void}>
              <div className="flex items-start space-x-2 mb-4">
                <RadioGroupItem value="cctp" id="cctp" />
                <div className="grid gap-1.5">
                  <Label htmlFor="cctp" className="font-medium">
                    Circle CCTP (Cross-Chain Transfer Protocol)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Fast and secure cross-chain transfers using Circle's USDC bridge. Best for USDC transfers between
                    supported chains.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="1inch" id="1inch" />
                <div className="grid gap-1.5">
                  <Label htmlFor="1inch" className="font-medium">
                    1inch Fusion+
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Optimized swaps and transfers with MEV protection. Best for token swaps and transfers on the same
                    chain.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          <div className="bg-muted/50 p-4 rounded-md">
            <h4 className="font-medium mb-2">Payment Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-medium">
                  {paymentDetails.amount} {selectedTokenInfo?.symbol || paymentDetails.selectedToken}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Network:</span>
                <span className="font-medium">{paymentDetails.selectedChain}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="font-medium">{selectedMethod === "cctp" ? "Circle CCTP" : "1inch Fusion+"}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Fee:</span>
                <span className="font-medium">
                  {selectedMethod === "cctp" ? "0.1%" : "0.3%"} (~$
                  {((selectedMethod === "cctp" ? 0.001 : 0.003) * paymentDetails.amount).toFixed(2)})
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev} disabled={isProcessing}>
          Back
        </Button>
        <Button onClick={handleContinue} disabled={isProcessing}>
          {isProcessing ? "Processing..." : "Continue"}
        </Button>
      </div>
    </div>
  )
}

