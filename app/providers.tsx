"use client"

import { type ReactNode, useEffect, useState } from "react"
import { RainbowKitProvider, getDefaultWallets, connectorsForWallets } from "@rainbow-me/rainbowkit"
import "@rainbow-me/rainbowkit/styles.css"
import { WagmiProvider, createConfig, http } from "wagmi"
import { mainnet, polygon, optimism, arbitrum, base } from "wagmi/chains"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const chains = [mainnet, polygon, optimism, arbitrum, base];

const projectId = "8d6d686ce4fe0b9145201746f5f3e2a0" // Replace with your WalletConnect project ID
const { wallets } = getDefaultWallets({
  appName: "EVM Payment Gateway",
  projectId,
})

const connectors = connectorsForWallets(wallets, { projectId });

const wagmiConfig = createConfig({
  chains,
  connectors,
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
  }
})

// Create a new QueryClient instance
const queryClient = new QueryClient()

export function Web3Provider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <RainbowKitProvider>{mounted && children}</RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  )
}

