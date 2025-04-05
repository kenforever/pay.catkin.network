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
import Image from "next/image"
import type { ProductData, PaymentDetails } from "../payment-flow"

interface PaymentOptionsProps {
  productData: ProductData
  paymentDetails: PaymentDetails
  onPaymentDetailsChange: (details: Partial<PaymentDetails>) => void
  onNext: () => void
  onPrev: () => void
}

interface Token {
  chainId: number
  address: string
  name: string
  symbol: string
  decimals: number
  logoURI?: string
}

const chains = [
  { id: "ethereum", name: "Ethereum", chainId: 1 },
  { id: "avax", name: "Avalanche", chainId: 43114 },
  { id: "base", name: "Base", chainId: 8453 },
  { id: "linea", name: "Linea", chainId: 59144 },
  { id: "polygon", name: "Polygon", chainId: 137 },
  { id: "arbitrum", name: "Arbitrum", chainId: 42161 },
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
  const [availableTokens, setAvailableTokens] = useState<Token[]>([])
  const [allTokens, setAllTokens] = useState<Token[]>([])
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)
  const { isConnected } = useAccount()

  // Fetch token list from CoinGecko
  useEffect(() => {
    const fetchTokens = async () => {
      try {
        setIsLoadingTokens(true)
        const response = await fetch("https://tokens.coingecko.com/uniswap/all.json")
        if (!response.ok) {
          throw new Error("Failed to fetch token list")
        }
        const data = await response.json()
        setAllTokens(data.tokens)
      } catch (error) {
        console.error("Error fetching token list:", error)
      } finally {
        setIsLoadingTokens(false)
      }
    }

    fetchTokens()
  }, [])

  // Filter tokens based on selected chain
  useEffect(() => {
    if (selectedChain && allTokens.length > 0) {
      const selectedChainObj = chains.find((chain) => chain.id === selectedChain)
      if (selectedChainObj) {
        // Filter tokens for the selected chain
        // For demo purposes, we'll use Ethereum tokens for all chains since the API mainly has Ethereum tokens
        // In a real implementation, you would filter by the actual chainId
        const chainTokens = allTokens.slice(0, 50) // Limit to 50 tokens for performance
        setAvailableTokens(chainTokens)
      } else {
        setAvailableTokens([])
      }

      // Reset token selection
      setSelectedToken("")
    } else {
      setAvailableTokens([])
    }
  }, [selectedChain, allTokens])

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
    // Find the selected token object to get its address
    const tokenObj = availableTokens.find((token) => token.address === selectedToken)

    onPaymentDetailsChange({
      amount,
      selectedChain,
      selectedToken: selectedToken,
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
              <h3 className="text-lg font-medium">Connect Wallet</h3>
              <ConnectButton />
            </div>

            {isConnected && (
              <>
                <div>
                  <Label htmlFor="chain">Select Chain</Label>
                  <Select value={selectedChain} onValueChange={handleChainChange}>
                    <SelectTrigger id="chain" className="mt-1">
                      <SelectValue placeholder="Select blockchain network" />
                    </SelectTrigger>
                    <SelectContent>
                      {chains.map((chain) => (
                        <SelectItem key={chain.id} value={chain.id}>
                          {chain.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="token">Select Token</Label>
                  <Select
                    value={selectedToken}
                    onValueChange={handleTokenChange}
                    disabled={!selectedChain || isLoadingTokens}
                  >
                    <SelectTrigger id="token" className="mt-1">
                      <SelectValue placeholder={isLoadingTokens ? "Loading tokens..." : "Select token"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {availableTokens.map((token) => (
                        <SelectItem key={token.address} value={token.address}>
                          <div className="flex items-center gap-2">
                            {token.logoURI && (
                              <div className="relative w-5 h-5 rounded-full overflow-hidden">
                                <Image
                                  src={token.logoURI || "/placeholder.svg"}
                                  alt={token.name}
                                  width={20}
                                  height={20}
                                  className="object-contain"
                                />
                              </div>
                            )}
                            <span>{token.symbol}</span>
                          </div>
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

