"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { PaymentDetails } from "../payment-flow"
import { CheckCircle, AlertCircle } from "lucide-react"
import Image from "next/image"

interface AllowanceProps {
  paymentDetails: PaymentDetails
  needsApproval: boolean
  onNext: () => void
  onPrev: () => void
}

export default function Allowance({ paymentDetails, needsApproval, onNext, onPrev }: AllowanceProps) {
  const [isApproving, setIsApproving] = useState(false)
  const [isApproved, setIsApproved] = useState(!needsApproval)
  const [selectedTokenInfo, setSelectedTokenInfo] = useState<any>(null)

  // 設置代幣資訊
  useEffect(() => {
    if (paymentDetails.selectedToken) {
      setSelectedTokenInfo(paymentDetails.selectedToken)
    }
  }, [paymentDetails.selectedToken])

  const checkAllowance = async () => {
    try {
      // 在實際實現中，你會呼叫代幣合約的 allowance 函數
      // 例如使用 ethers.js:
      // const tokenContract = new ethers.Contract(paymentDetails.selectedToken.address, ERC20_ABI, provider);
      // const allowance = await tokenContract.allowance(userAddress, "0xabc");
      // const isAllowanceSufficient = allowance.gte(paymentDetails.amount);

      console.log(`檢查代幣授權: ${paymentDetails.selectedToken} 給 0xabc`)

      // 模擬授權檢查結果
      const hasEnoughAllowance = Math.random() > 0.5

      setIsApproved(hasEnoughAllowance)
      return hasEnoughAllowance
    } catch (error) {
      console.error("檢查授權時發生錯誤:", error)
      setIsApproved(false)
      return false
    }
  }

  // 在組件掛載或選定代幣變更時檢查授權
  useEffect(() => {
    if (needsApproval) {
      const checkAndProgress = async () => {
        const hasAllowance = await checkAllowance()
        // 如果授權足夠，自動進入下一步
        if (hasAllowance) {
          onNext()
        }
      }

      checkAndProgress()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentDetails.selectedToken, needsApproval])

  const handleApprove = async () => {
    try {
      setIsApproving(true)
      // 在實際實現中，你會呼叫代幣的 approve 函數
      // 例如使用 ethers.js:
      // const tokenContract = new ethers.Contract(paymentDetails.selectedToken.address, ERC20_ABI, signer);
      // const tx = await tokenContract.approve("0xabc", ethers.constants.MaxUint256);
      // await tx.wait();

      console.log(`批准代幣: ${paymentDetails.selectedToken} 給 0xabc 地址使用`)

      // 模擬批准交易
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
              <div className="flex items-center gap-2 mt-2">
                <span>You have approved the spending of your</span>
                {selectedTokenInfo?.logoURI && (
                  <div className="relative w-5 h-5 rounded-full overflow-hidden">
                    <Image
                      src={selectedTokenInfo.logoURI || "/placeholder.svg"}
                      alt={selectedTokenInfo.name}
                      width={20}
                      height={20}
                      className="object-contain"
                    />
                  </div>
                )}
                <span className="font-medium">{selectedTokenInfo?.symbol || "token"}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
              <h3 className="text-xl font-bold">Approval Required</h3>
              <div className="flex items-center gap-2 mt-2">
                <span>To proceed with this payment, you need to approve the spending of your</span>
                {selectedTokenInfo?.logoURI && (
                  <div className="relative w-5 h-5 rounded-full overflow-hidden">
                    <Image
                      src={selectedTokenInfo.logoURI || "/placeholder.svg"}
                      alt={selectedTokenInfo.name}
                      width={20}
                      height={20}
                      className="object-contain"
                    />
                  </div>
                )}
                <span className="font-medium">{selectedTokenInfo?.symbol || "token"}</span>
              </div>
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

