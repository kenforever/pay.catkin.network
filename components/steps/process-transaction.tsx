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
import Image from "next/image"

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

interface TokenList {
  name: string
  logoURI: string
  tokens: Token[]
}

const chainIdMap: Record<string, number> = {
  "ethereum": 1,
  "avax": 43114,
  "base": 8453,
  "linea": 59144,
  "polygon": 137,
  "arbitrum": 42161,
}

const chains = [
  { id: "ethereum", name: "Ethereum" },
  { id: "avax", name: "Avalanche" },
  { id: "base", name: "Base" },
  { id: "linea", name: "Linea" },
  { id: "polygon", name: "Polygon" },
  { id: "arbitrum", name: "Arbitrum" },
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
  const [selectedTokenData, setSelectedTokenData] = useState<Token | null>(null)
  const { isConnected, chainId } = useAccount()

  const fetchTokens = async () => {
    try {
      const response = await fetch("https://tokens.coingecko.com/uniswap/all.json")
      const data: TokenList = await response.json()
      setAllTokens(data.tokens)
    } catch (error) {
      console.error("Error fetching tokens:", error)
    }
  }

  useEffect(() => {
    fetchTokens()
  }, [])

  useEffect(() => {
    if (chainId) {
      // Find the chain name from chainId
      const chainEntry = Object.entries(chainIdMap).find(([_, id]) => id === chainId)
      if (chainEntry) {
        setSelectedChain(chainEntry[0])
      }
    }
  }, [chainId])

  useEffect(() => {
    if (selectedChain && allTokens.length > 0) {
      const chainId = chainIdMap[selectedChain]
      const filteredTokens = allTokens.filter(token => token.chainId === chainId)
      setAvailableTokens(filteredTokens)

      // Reset token selection if current selection is not available
      if (selectedToken && !filteredTokens.some((t) => t.address === selectedToken)) {
        setSelectedToken("")
        setSelectedTokenData(null)
      }
    } else {
      setAvailableTokens([])
    }
  }, [selectedChain, allTokens, selectedToken])

  useEffect(() => {
    if (selectedToken && availableTokens.length > 0) {
      const tokenData = availableTokens.find(t => t.address === selectedToken) || null
      setSelectedTokenData(tokenData)
    } else {
      setSelectedTokenData(null)
    }
  }, [selectedToken, availableTokens])

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
      selectedTokenAddress: selectedTokenData?.address,
      selectedTokenSymbol: selectedTokenData?.symbol,
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
                <div>
                  <Label htmlFor="chain">Network</Label>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Chain will be selected automatically based on your connected wallet.
                  </div>
                </div>

                <div>
                  <Label htmlFor="token">Select Token</Label>
                  <Select value={selectedToken} onValueChange={handleTokenChange} disabled={!selectedChain}>
                    <SelectTrigger id="token" className="mt-1">
                      <SelectValue placeholder="Select token">
                        {selectedTokenData && (
                          <div className="flex items-center">
                            {selectedTokenData.logoURI && (
                              <Image 
                                src={selectedTokenData.logoURI} 
                                alt={selectedTokenData.symbol} 
                                width={20} 
                                height={20} 
                                className="mr-2 rounded-full"
                              />
                            )}
                            {selectedTokenData.symbol}
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {availableTokens.map((token) => (
                        <SelectItem key={token.address} value={token.address}>
                          <div className="flex items-center">
                            {token.logoURI && (
                              <Image 
                                src={token.logoURI} 
                                alt={token.symbol} 
                                width={20} 
                                height={20} 
                                className="mr-2 rounded-full"
                              />
                            )}
                            {token.symbol}
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

