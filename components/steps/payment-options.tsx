"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount } from "wagmi"
import type { ProductData, PaymentDetails } from "../payment-flow"

interface PaymentOptionsProps {
  productData: ProductData
  paymentDetails: PaymentDetails
  onPaymentDetailsChange: (details: Partial<PaymentDetails>) => void
  onNext: () => void
  onPrev: () => void
}

const chains = [
  { id: "ethereum", name: "Ethereum" },
  { id: "avax", name: "Avalanche" },
  { id: "base", name: "Base" },
  { id: "linea", name: "Linea" },
  { id: "polygon", name: "Polygon" },
  { id: "arbitrum", name: "Arbitrum" },
]

const tokens = [
  { id: "USDC", name: "USDC", chains: ["ethereum", "avax", "base", "linea", "polygon", "arbitrum"] },
  { id: "USDT", name: "USDT", chains: ["ethereum", "avax", "polygon", "arbitrum"] },
  { id: "ETH", name: "ETH", chains: ["ethereum", "base", "linea", "arbitrum"] },
  { id: "AVAX", name: "AVAX", chains: ["avax"] },
  { id: "MATIC", name: "MATIC", chains: ["polygon"] },
]

export default function PaymentOptions({
  productData,
  paymentDetails,
  onPaymentDetailsChange,
  onNext,
  onPrev,
}: PaymentOptionsProps) {
  const [amount, setAmount] = useState<number>(productData.price || 0)
  const [selectedChain, setSelectedChain] = useState<string>("")
  const [selectedToken, setSelectedToken] = useState<string>("")
  const [availableTokens, setAvailableTokens] = useState<typeof tokens>([])
  const { isConnected } = useAccount()

  useEffect(() => {
    if (selectedChain) {
      const filteredTokens = tokens.filter((token) => token.chains.includes(selectedChain))
      setAvailableTokens(filteredTokens)

      // Reset token selection if current selection is not available
      if (selectedToken && !filteredTokens.some((t) => t.id === selectedToken)) {
        setSelectedToken("")
      }
    } else {
      setAvailableTokens([])
    }
  }, [selectedChain, selectedToken])

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(e.target.value)
    setAmount(isNaN(value) ? 0 : value)
  }

  const handleChainChange = (value: string) => {
    setSelectedChain(value)
  }

  const handleTokenChange = (value: string) => {
    setSelectedToken(value)
  }

  const handleNext = () => {
    onPaymentDetailsChange({
      amount,
      selectedChain,
      selectedToken,
      receiverToken: productData.token || "USDC",
    })
    onNext()
  }

  const isProduct = !!productData.id
  const isFormValid = amount > 0 && selectedChain && selectedToken

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Payment Options</h2>

      <Card className="p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="amount">Amount</Label>
            {isProduct ? (
              <div className="text-2xl font-bold mt-2">${productData.price?.toFixed(2)}</div>
            ) : (
              <Input
                id="amount"
                type="number"
                value={amount || ""}
                onChange={handleAmountChange}
                placeholder="Enter amount"
                min="0"
                step="0.01"
              />
            )}
          </div>

          <div className="space-y-4 mt-6">
            <div className="flex justify-between items-center">
              <ConnectButton />
            </div>

            {isConnected && (
              <>
                {/* <div>
                  <Label htmlFor="chain">Network</Label>
                  <div className="mt-1 text-sm text-muted-foreground">
                  Chain will be selected automatically based on your connected wallet.
                  </div>
                </div> */}

                <div>
                  <Label htmlFor="token">Select Token</Label>
                  <Select value={selectedToken} onValueChange={handleTokenChange} disabled={!selectedChain}>
                    <SelectTrigger id="token" className="mt-1">
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTokens.map((token) => (
                        <SelectItem key={token.id} value={token.id}>
                          {token.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          Back
        </Button>
        <Button onClick={handleNext} disabled={!isConnected || !isFormValid}>
          Continue
        </Button>
      </div>
    </div>
  )
}

