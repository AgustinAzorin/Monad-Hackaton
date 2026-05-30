"use client"

import { Bell, Settings, Search } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

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
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            M
          </div>
          <span className="hidden font-semibold sm:inline">MiSaldo</span>
        </div>

        <div className="hidden md:flex items-center gap-1 rounded-full bg-muted px-4 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar transacciones, contactos..."
            className="w-64 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {alerts > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
            )}
          </Button>
          <Link href="/configuracion">
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
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
