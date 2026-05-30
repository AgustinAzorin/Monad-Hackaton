"use client"

import { FolderKanban, ArrowLeftRight, Users, Bell } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { CategoriesTab } from "./tabs/categories-tab"
import { TransactionsTab } from "./tabs/transactions-tab"
import { ClientsTab } from "./tabs/clients-tab"
import { NotificationsTab } from "./tabs/notifications-tab"
import type { CuentaCorriente, TransaccionConDetalle } from "@/types/cuenta"

interface NavigationTabsProps {
  cuentas: CuentaCorriente[]
  transacciones: TransaccionConDetalle[]
}

const tabs = [
  { id: "transactions", label: "Transacciones", icon: ArrowLeftRight },
  { id: "clients", label: "Cuentas", icon: Users },
  { id: "categories", label: "Categorías", icon: FolderKanban },
  { id: "notifications", label: "Alertas", icon: Bell },
]

export function NavigationTabs({ cuentas, transacciones }: NavigationTabsProps) {
  return (
    <Tabs defaultValue="transactions" className="w-full">
      <TabsList className="grid h-auto w-full grid-cols-4 gap-1 rounded-xl bg-muted p-1">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className="flex flex-col items-center gap-1 rounded-lg py-2.5 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm sm:flex-row sm:gap-2 sm:text-sm"
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden text-[10px]">{tab.label.slice(0, 6)}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="mt-4">
        <TabsContent value="transactions" className="m-0">
          <TransactionsTab transacciones={transacciones} />
        </TabsContent>
        <TabsContent value="clients" className="m-0">
          <ClientsTab cuentas={cuentas} transacciones={transacciones} />
        </TabsContent>
        <TabsContent value="categories" className="m-0">
          <CategoriesTab />
        </TabsContent>
        <TabsContent value="notifications" className="m-0">
          <NotificationsTab transacciones={transacciones} cuentas={cuentas} />
        </TabsContent>
      </div>
    </Tabs>
  )
}
