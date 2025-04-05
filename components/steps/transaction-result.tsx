"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { ProductData, PaymentDetails } from "../payment-flow"
import { CheckCircle, XCircle, ExternalLink } from "lucide-react"
import anime from "animejs"

interface TransactionResultProps {
  txHash: string
  success: boolean | null
  productData: ProductData | null
  paymentDetails: PaymentDetails
  onRetry: () => void
}

export default function TransactionResult({
  txHash,
  success = true, // Default to success for demo
  productData,
  paymentDetails,
  onRetry,
}: TransactionResultProps) {
  const fireworksRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (success && fireworksRef.current) {
      // Create fireworks animation
      const createFirework = () => {
        const firework = document.createElement("div")
        firework.className = "absolute w-2 h-2 bg-primary rounded-full"

        const x = Math.random() * 100
        const y = Math.random() * 100

        firework.style.left = `${x}%`
        firework.style.top = `${y}%`

        fireworksRef.current?.appendChild(firework)

        anime({
          targets: firework,
          scale: [
            { value: 1, duration: 0, delay: 0 },
            { value: 15, duration: 300, easing: "easeOutExpo" },
          ],
          opacity: [
            { value: 1, duration: 0, delay: 0 },
            { value: 0, duration: 300, delay: 200, easing: "easeOutExpo" },
          ],
          complete: () => {
            firework.remove()
          },
        })

        return firework
      }

      // Create multiple fireworks
      const interval = setInterval(() => {
        if (fireworksRef.current) {
          createFirework()
        } else {
          clearInterval(interval)
        }
      }, 200)

      // Clean up
      return () => {
        clearInterval(interval)
        if (fireworksRef.current) {
          fireworksRef.current.innerHTML = ""
        }
      }
    }
  }, [success])

  const getExplorerUrl = () => {
    const chainId = paymentDetails.selectedChain
    const baseUrls: Record<string, string> = {
      ethereum: "https://etherscan.io/tx/",
      avax: "https://snowtrace.io/tx/",
      base: "https://basescan.org/tx/",
      linea: "https://lineascan.build/tx/",
      polygon: "https://polygonscan.com/tx/",
      arbitrum: "https://arbiscan.io/tx/",
    }

    return (baseUrls[chainId] || "https://etherscan.io/tx/") + txHash
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Transaction Result</h2>

      <Card className="p-6 relative overflow-hidden">
        {success && <div ref={fireworksRef} className="absolute inset-0 pointer-events-none" />}

        <div className="flex flex-col items-center justify-center py-8 text-center relative z-10">
          {success ? (
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
          ) : (
            <XCircle className="h-16 w-16 text-destructive mb-4" />
          )}

          <h3 className="text-xl font-bold mb-2">{success ? "Payment Successful!" : "Payment Failed"}</h3>

          <p className="text-muted-foreground mb-6">
            {success
              ? "Your payment has been processed successfully."
              : "There was an error processing your payment. Please try again."}
          </p>

          {txHash && (
            <a
              href={getExplorerUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-primary hover:underline mb-6"
            >
              View on Explorer <ExternalLink className="ml-1 h-4 w-4" />
            </a>
          )}

          {success && (
            <Card className="w-full max-w-md p-4 bg-muted/50">
              <h4 className="font-medium mb-4">Payment Receipt</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span className="font-medium">
                    {paymentDetails.amount} {paymentDetails.selectedToken}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Network:</span>
                  <span className="font-medium">{paymentDetails.selectedChain}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span className="font-medium">
                    {paymentDetails.selectedToken === "USDC" &&
                    paymentDetails.receiverToken === "USDC" &&
                    ["avax", "base", "ethereum", "linea"].includes(paymentDetails.selectedChain)
                      ? "CCTP Fast Transfer"
                      : "1inch Fusion+ Transfer"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Transaction ID:</span>
                  <span className="font-medium truncate max-w-[200px]">{txHash}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span className="font-medium">{new Date().toLocaleString()}</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </Card>

      <div className="flex justify-center">
        {success ? (
          <Button onClick={() => (window.location.href = "/")}>Return Home</Button>
        ) : (
          <Button onClick={onRetry}>Try Again</Button>
        )}
      </div>
    </div>
  )
}

