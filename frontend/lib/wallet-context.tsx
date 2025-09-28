"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

interface WalletState {
  isConnected: boolean
  address: string | null
  walletType: string | null
  balance: number
}

interface WalletContextType {
  wallet: WalletState
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  signTransaction: (txData: any) => Promise<string>
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    address: null,
    walletType: null,
    balance: 0,
  })

  const [algodClient, setAlgodClient] = useState<any>(null)
  const [lute, setLute] = useState<any>(null)

  useEffect(() => {
    // Only initialize on client-side
    if (typeof window !== "undefined") {
      const initializeClients = async () => {
        try {
          const { Algodv2 } = await import("algosdk")
          const LuteConnect = (await import("lute-connect")).default

          const client = new Algodv2("", "https://testnet-api.algonode.cloud", "")
          const luteInstance = new LuteConnect()

          setAlgodClient(client)
          setLute(luteInstance)
        } catch (error) {
          console.error("[v0] Failed to initialize wallet clients:", error)
        }
      }

      initializeClients()
    }
  }, [])

  const connectWallet = async () => {
  if (!algodClient || !lute) {
    throw new Error("Wallet clients not initialized")
  }

  try {
    console.log("[v0] Starting Lute wallet connection...")

    // 1) Get full genesis object (and log it once for debugging)
    let genesisInfo: any
    try {
      genesisInfo = await algodClient.genesis().do()
    } catch (e) {
      console.warn("[v0] algod.genesis() failed:", e)
      genesisInfo = null
    }

    // 2) Try multiple common fields to build genesisID
    let genesisID: string | undefined

    if (genesisInfo) {
      // common variants
      genesisID =
        (genesisInfo.network && genesisInfo.id && `${genesisInfo.network}-${genesisInfo.id}`) || // old approach
        genesisInfo.genesisID || // some providers use 'genesisID'
        genesisInfo.genesis_id || // snake_case variant
        genesisInfo.genesisId || // camelCase
        genesisInfo["genesis-id"] // other variants
    }

    // 3) fallback to known TestNet id if nothing found
    if (!genesisID) {
      console.warn("[v0] Could not derive genesisID from response, using fallback 'testnet-v1.0'")
      genesisID = "testnet-v1.0"
    }

    console.log("[v0] Using Genesis ID:", genesisID)

    // 4) IMPORTANT: ensure this call is from a user gesture (button click)
    const accounts = await lute.connect(genesisID)

    if (accounts && accounts.length > 0) {
      const userAddress = accounts[0]
      console.log("[v0] Connected to address:", userAddress)

      // fetch balance (safe)
      let balance = 0
      try {
        const accountInfo = await algodClient.accountInformation(userAddress).do()
        const rawAmount = accountInfo?.amount ?? 0
        // handle BigInt or number
        const microAlgos = typeof rawAmount === "bigint" ? Number(rawAmount) : Number(rawAmount)
        balance = microAlgos / 1_000_000
      } catch (e) {
        console.warn("[v0] Could not fetch balance:", e)
      }

      setWallet({
        isConnected: true,
        address: userAddress,
        walletType: "lute",
        balance,
      })

      console.log("[v0] Wallet connected successfully")
    } else {
      throw new Error("No accounts returned from Lute")
    }
  } catch (error) {
    console.error("[v0] Wallet connection error:", error)
    // UI toast gösteriyorsan burada göster
    throw error
  }
}


  const disconnectWallet = () => {
    console.log("[v0] Disconnecting wallet...")
    setWallet({
      isConnected: false,
      address: null,
      walletType: null,
      balance: 0,
    })
  }

  const signTransaction = async (txData: any): Promise<string> => {
    if (!wallet.isConnected || !wallet.address || !algodClient || !lute) {
      throw new Error("Wallet not connected or clients not initialized")
    }

    try {
      console.log("[v0] Starting transaction signing...")

      // Use Lute to sign the transaction
      const signedTxn = await lute.signTransaction(txData, wallet.address)

      // Submit to network
      const txId = await algodClient.sendRawTransaction(signedTxn).do()

      console.log("[v0] Transaction signed and submitted:", txId.txId)
      return txId.txId
    } catch (error) {
      console.error("[v0] Transaction signing error:", error)
      throw error
    }
  }

  return (
    <WalletContext.Provider value={{ wallet, connectWallet, disconnectWallet, signTransaction }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}
