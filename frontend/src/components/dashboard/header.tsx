"use client"

import Image from "next/image"
import { Bell, Menu, Settings, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { WalletButton } from "./wallet-button"

interface DashboardHeaderProps {
  userName?: string | null
  alerts?: number
}

function initials(name?: string | null) {
  if (!name) return "MI"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function DashboardHeader({ userName, alerts = 0 }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="FinanzaPro"
              width={36}
              height={36}
              priority
              className="h-9 w-9 rounded-lg object-cover"
            />
            <span className="hidden font-semibold sm:inline">FinanzaPro</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1 rounded-full bg-muted px-4 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar transacciones, clientes..."
            className="w-64 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-2">
          <WalletButton />
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {alerts > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
            <Settings className="h-5 w-5" />
          </Button>
          <Avatar className="h-9 w-9 cursor-pointer">
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {initials(userName)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
