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
import tokenList from "../jsons/support_token_list.json"

interface PaymentOptionsProps {
  productData: ProductData
  paymentDetails: PaymentDetails
  onPaymentDetailsChange: (details: Partial<PaymentDetails>) => void
  onNext: () => void
  onPrev: () => void
}

// 從JSON文件生成鏈的數組
const chains = Object.keys(tokenList).map(name => ({
  id: name.toLowerCase(),
  name
}));

// 生成代幣數組以及它們支持的鏈
interface Token {
  id: string;
  name: string;
  address: string;
  chains: string[];
}

const tokens: Token[] = [];

// 處理JSON並構建代幣數組
Object.entries(tokenList).forEach(([chainName, chainTokens]) => {
  const chainId = chainName.toLowerCase();
  
  Object.entries(chainTokens).forEach(([tokenId, tokenData]) => {
    // 查找此代幣是否已在數組中
    const existingToken = tokens.find(t => t.id === tokenId);
    
    if (existingToken) {
      // 如果代幣已存在，將此鏈添加到其支持的鏈中
      existingToken.chains.push(chainId);
    } else {
      // 否則創建新的代幣記錄
      tokens.push({
        id: tokenId,
        name: tokenId.toUpperCase(),
        address: tokenData.address,
        chains: [chainId]
      });
    }
  });
});

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
  const { isConnected } = useAccount()

  useEffect(() => {
    if (selectedChain) {
      const filteredTokens = tokens.filter((token) => token.chains.includes(selectedChain))
      setAvailableTokens(filteredTokens)

      // 如果當前選擇的代幣在新的鏈上不可用，則重置選擇
      if (selectedToken && !filteredTokens.some((t) => t.address === selectedToken)) {
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
    console.log("Selected token:", value)
  }

  const handleNext = () => {
    onPaymentDetailsChange({
      amount,
      selectedChain,
      selectedToken,
      receiverToken: productData.token || "usdc",
    })
    onNext()
  }

  const isProduct = !!productData.id
  const isFormValid = amount > 0 && selectedChain && selectedToken

  // 獲取特定鏈上代幣的地址
  const getTokenAddress = (tokenId: string, chainId: string) => {
    const chainTokens = tokenList[chains.find(c => c.id === chainId)?.name || ""];
    return chainTokens?.[tokenId]?.address || "";
  }

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
                  <Select value={selectedToken} onValueChange={handleTokenChange} disabled={!selectedChain}>
                    <SelectTrigger id="token" className="mt-1">
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTokens.map((token) => {
                        // 獲取特定鏈上此代幣的地址
                        const address = getTokenAddress(token.id, selectedChain);
                        return (
                          <SelectItem key={token.id} value={address}>
                            {token.name}
                          </SelectItem>
                        );
                      })}
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

