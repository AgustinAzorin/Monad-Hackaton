"use client"

import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from "wagmi"
import { monadTestnet } from "viem/chains"
import { Wallet, LogOut, AlertTriangle, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWalletLink } from "@/hooks/useWalletLink"

function short(addr?: string | null) {
  if (!addr) return ""
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function WalletButton() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, status } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const { linkedAddress, linkWallet, loading, error } = useWalletLink()

  const connecting = status === "pending"
  const wrongChain = isConnected && chainId !== monadTestnet.id
  const linked =
    !!linkedAddress &&
    !!address &&
    linkedAddress.toLowerCase() === address.toLowerCase()

  // 1) Sin conexión
  if (!isConnected) {
    const connector = connectors[0]
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={!connector || connecting}
        onClick={() => connector && connect({ connector })}
        className="gap-2"
      >
        {connecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wallet className="h-4 w-4" />
        )}
        {connector ? "Conectar wallet" : "Instalá MetaMask"}
      </Button>
    )
  }

  // 2) Red incorrecta
  if (wrongChain) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => switchChain({ chainId: monadTestnet.id })}
        className="gap-2 border-amber-500 text-amber-600"
      >
        <AlertTriangle className="h-4 w-4" />
        Cambiar a Monad
      </Button>
    )
  }

  // 3) Conectada pero no vinculada (o address distinta de la vinculada)
  if (!linked) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {short(address)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => address && linkWallet(address)}
          className="gap-2 border-amber-500 text-amber-600"
          title={error ?? undefined}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wallet className="h-4 w-4" />
          )}
          Vincular wallet
        </Button>
      </div>
    )
  }

  // 4) Conectada + vinculada
  return (
    <div className="flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5">
      <Check className="h-3.5 w-3.5 text-emerald-600" />
      <span className="text-xs font-medium text-emerald-700">{short(address)}</span>
      <button
        onClick={() => disconnect()}
        className="text-muted-foreground hover:text-foreground"
        title="Desconectar"
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
