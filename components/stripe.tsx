"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements } from "@stripe/react-stripe-js"

const stripePromise = loadStripe("pk_test_placeholder")

interface StripeProps {
  options: {
    mode: string
    amount: number
    currency: string
  }
  children: React.ReactNode
  className?: string
}

export function Stripe({ options, children, className }: StripeProps) {
  const [clientSecret, setClientSecret] = useState("")

  useEffect(() => {
    // This would normally fetch from your backend to create a payment intent
    // For demo purposes, we're just setting a mock client secret
    setClientSecret("pi_mock_secret_123456789")
  }, [options])

  return (
    <div className={className}>
      {clientSecret && (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: "stripe",
            },
          }}
        >
          {children}
        </Elements>
      )}
    </div>
  )
}

