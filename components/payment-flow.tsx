"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useAccount } from "wagmi"
import { ConnectButton } from "@rainbow-me/rainbowkit"

import ProductInfo from "./steps/product-info"
import PaymentOptions from "./steps/payment-options"
import ProcessTransaction from "./steps/process-transaction"
import Allowance from "./steps/allowance"
import TransactionProcessing from "./steps/transaction-processing"
import TransactionResult from "./steps/transaction-result"

export type ProductData = {
  id?: string
  username?: string
  title?: string
  description?: string
  price?: number
  image?: string
  avatar?: string
  token?: string
}

// Update the PaymentDetails type to include token address
export type PaymentDetails = {
  amount: number
  selectedChain: string
  selectedToken: string // This will now store the token address
  receiverToken: string
}

export default function PaymentFlow() {
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState(1)
  const [productData, setProductData] = useState<ProductData | null>(null)
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    amount: 0,
    selectedChain: "",
    selectedToken: "",
    receiverToken: "",
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [txHash, setTxHash] = useState("")
  const [needsApproval, setNeedsApproval] = useState(false)
  const [txSuccess, setTxSuccess] = useState<boolean | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"cctp" | "1inch">("1inch")
  const { isConnected } = useAccount()

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setIsLoading(true)
        const productId = searchParams.get("id")
        const username = searchParams.get("username")

        if (!productId && !username) {
          throw new Error("No product ID or username provided")
        }

        let endpoint = ""
        if (productId) {
          endpoint = `http://localhost:8000/product/product/${productId}`
        } else if (username) {
          endpoint = `http://localhost/payment/username?username=${username}`
        }

        const response = await fetch(endpoint)
        if (!response.ok) {
          throw new Error("Failed to fetch product data")
        }

        const data = await response.json()
        setProductData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProductData()
  }, [searchParams])

  const handleNextStep = () => {
    setCurrentStep((prev) => prev + 1)
  }

  const handlePrevStep = () => {
    setCurrentStep((prev) => prev - 1)
  }

  const handlePaymentDetailsChange = (details: Partial<PaymentDetails>) => {
    setPaymentDetails((prev) => ({ ...prev, ...details }))
  }

  const handleSetNeedsApproval = (needs: boolean) => {
    setNeedsApproval(needs)
  }

  const handleSetTxHash = (hash: string) => {
    setTxHash(hash)
  }

  const handleSetTxSuccess = (success: boolean) => {
    setTxSuccess(success)
  }

  const handleSetPaymentMethod = (method: "cctp" | "1inch") => {
    setPaymentMethod(method)
  }

  const handleRetry = () => {
    setCurrentStep(1)
    setTxHash("")
    setTxSuccess(null)
  }

  const variants = {
    enter: { opacity: 0, x: 100 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -100 },
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-destructive/10 rounded-lg text-center">
        <h2 className="text-xl font-bold text-destructive mb-4">Error</h2>
        <p className="mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold">Payment Gateway</h1>
        <div className="flex items-center mt-4">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === currentStep
                    ? "bg-primary text-primary-foreground"
                    : step < currentStep
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {step}
              </div>
              {step < 6 && <div className={`h-1 w-10 ${step < currentStep ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial="enter"
            animate="center"
            exit="exit"
            variants={variants}
            transition={{ type: "tween", duration: 0.3 }}
            className="h-full"
          >
            {currentStep === 1 && productData && <ProductInfo productData={productData} onNext={handleNextStep} />}

            {currentStep === 2 && productData && (
              <PaymentOptions
                productData={productData}
                paymentDetails={paymentDetails}
                onPaymentDetailsChange={handlePaymentDetailsChange}
                onNext={handleNextStep}
                onPrev={handlePrevStep}
              />
            )}

            {currentStep === 3 && (
              <ProcessTransaction
                paymentDetails={paymentDetails}
                onNext={handleNextStep}
                onPrev={handlePrevStep}
                setNeedsApproval={handleSetNeedsApproval}
                setPaymentMethod={handleSetPaymentMethod}
              />
            )}

            {currentStep === 4 && (
              <Allowance
                paymentDetails={paymentDetails}
                needsApproval={needsApproval}
                onNext={handleNextStep}
                onPrev={handlePrevStep}
              />
            )}

            {currentStep === 5 && (
              <TransactionProcessing
                paymentDetails={paymentDetails}
                paymentMethod={paymentMethod}
                onNext={handleNextStep}
                setTxHash={handleSetTxHash}
              />
            )}

            {currentStep === 6 && (
              <TransactionResult
                txHash={txHash}
                success={txSuccess}
                productData={productData}
                paymentDetails={paymentDetails}
                paymentMethod={paymentMethod}
                onRetry={handleRetry}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {!isConnected && currentStep > 1 && currentStep < 6 && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Connect Your Wallet</h3>
            <p className="mb-6">Please connect your wallet to continue with the payment process.</p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

