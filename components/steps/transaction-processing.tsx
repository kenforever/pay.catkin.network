"use client"

import { useEffect, useState, useRef } from "react"
import { Card } from "@/components/ui/card"
import type { PaymentDetails } from "../payment-flow"
import anime from "animejs"

interface TransactionProcessingProps {
  paymentDetails: PaymentDetails
  onNext: () => void
  setTxHash: (hash: string) => void
}

export default function TransactionProcessing({ paymentDetails, onNext, setTxHash }: TransactionProcessingProps) {
  const [isProcessing, setIsProcessing] = useState(true)
  const animationRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const processTransaction = async () => {
      try {
        // Simulate transaction processing
        await new Promise((resolve) => setTimeout(resolve, 3000))

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
  }, [onNext, setTxHash])

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
        <div className="flex flex-col items-center justify-center py-12">
          <div ref={animationRef} className="flex items-center justify-center gap-2 mb-6">
            <div className="dot w-4 h-4 bg-primary rounded-full"></div>
            <div className="dot w-4 h-4 bg-primary rounded-full"></div>
            <div className="dot w-4 h-4 bg-primary rounded-full"></div>
            <div className="dot w-4 h-4 bg-primary rounded-full"></div>
            <div className="dot w-4 h-4 bg-primary rounded-full"></div>
          </div>
          <h3 className="text-xl font-medium mb-2">
            {isProcessing ? "Processing Your Payment" : "Transaction Submitted"}
          </h3>
          <p className="text-muted-foreground text-center max-w-md">
            {isProcessing
              ? "Please wait while we process your transaction. This may take a few moments."
              : "Your transaction has been submitted to the blockchain. Moving to the next step..."}
          </p>
        </div>
      </Card>
    </div>
  )
}

