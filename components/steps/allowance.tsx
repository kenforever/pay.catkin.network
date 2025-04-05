"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { PaymentDetails } from "../payment-flow"
import { CheckCircle, AlertCircle } from "lucide-react"

interface AllowanceProps {
  paymentDetails: PaymentDetails
  needsApproval: boolean
  onNext: () => void
  onPrev: () => void
}

export default function Allowance({ paymentDetails, needsApproval, onNext, onPrev }: AllowanceProps) {
  const [isApproving, setIsApproving] = useState(false)
  const [isApproved, setIsApproved] = useState(!needsApproval)

  const handleApprove = async () => {
    try {
      setIsApproving(true)
      // Simulate approval transaction
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setIsApproved(true)
    } catch (error) {
      console.error("Error approving token:", error)
    } finally {
      setIsApproving(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Token Approval</h2>

      <Card className="p-6">
        <div className="space-y-6">
          {isApproved ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-xl font-bold">Approval Confirmed</h3>
              <p className="text-muted-foreground mt-2">
                You have approved the spending of your {paymentDetails.selectedToken} tokens.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
              <h3 className="text-xl font-bold">Approval Required</h3>
              <p className="text-muted-foreground mt-2">
                To proceed with this payment, you need to approve the spending of your {paymentDetails.selectedToken}{" "}
                tokens.
              </p>
              <Button onClick={handleApprove} disabled={isApproving} className="mt-6">
                {isApproving ? "Approving..." : "Approve"}
              </Button>
            </div>
          )}
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev} disabled={isApproving}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!isApproved || isApproving}>
          Continue
        </Button>
      </div>
    </div>
  )
}

