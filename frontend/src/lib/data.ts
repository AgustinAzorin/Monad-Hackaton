export type TransactionStatus =
  | "pendiente"
  | "procesando"
  | "pagado"
  | "cobrado"
  | "vencido"
  | "parcialmente_pagado"
  | "cancelado"
  | "devuelto"
  | "rechazado"
  | "entregado"

export type TransactionType = "pago" | "cobro"

export type TimelineEvent = {
  id: string
  timestamp: string
  event: string
  description?: string
}

export type Document = {
  id: string
  name: string
  type: "factura" | "orden_compra" | "comprobante" | "recibo" | "otro"
  url: string
}

export type Incident = {
  id: string
  date: string
  type: string
  cause: string
  status: "pendiente" | "resuelto" | "en_proceso"
}

export type Transaction = {
  id: string
  clientOrProvider: string
  clientOrProviderEmail: string
  clientOrProviderPhone: string
  type: TransactionType
  category: string
  createdAt: string
  dueDate: string
  amount: number
  pendingBalance: number
  taxes: number
  discounts: number
  commission: number
  status: TransactionStatus
  paymentMethod: string
  bank: string
  account: string
  bankReference: string
  operationNumber: string
  responsiblePerson: string
  processedAt: string
  timeline: TimelineEvent[]
  documents: Document[]
  incidents: Incident[]
  notes: string
}

export const mockTransactions: Transaction[] = [
  {
    id: "TXN-001",
    clientOrProvider: "Tecnología Avanzada S.A.",
    clientOrProviderEmail: "contacto@tecavanzada.com",
    clientOrProviderPhone: "+52 55 1234 5678",
    type: "pago",
    category: "Servicios de software",
    createdAt: "2024-01-15T10:30:00",
    dueDate: "2024-02-15T23:59:59",
    amount: 125000.0,
    pendingBalance: 0,
    taxes: 20000.0,
    discounts: 5000.0,
    commission: 1250.0,
    status: "pagado",
    paymentMethod: "Transferencia bancaria",
    bank: "BBVA",
    account: "****4521",
    bankReference: "REF-2024-001234",
    operationNumber: "OP-987654",
    responsiblePerson: "María García",
    processedAt: "2024-01-18T14:22:00",
    timeline: [
      { id: "1", timestamp: "2024-01-15T10:30:00", event: "Transacción creada", description: "Orden de pago generada" },
      { id: "2", timestamp: "2024-01-15T11:45:00", event: "Factura adjuntada", description: "Factura CFDI-001234" },
      { id: "3", timestamp: "2024-01-18T09:00:00", event: "Pago aprobado", description: "Autorizado por María García" },
      { id: "4", timestamp: "2024-01-18T14:15:00", event: "Transferencia enviada", description: "Monto: $125,000.00" },
      { id: "5", timestamp: "2024-01-18T14:22:00", event: "Confirmación bancaria", description: "Ref: REF-2024-001234" },
    ],
    documents: [
      { id: "d1", name: "Factura CFDI-001234.pdf", type: "factura", url: "#" },
      { id: "d2", name: "Orden de compra OC-789.pdf", type: "orden_compra", url: "#" },
      { id: "d3", name: "Comprobante transferencia.pdf", type: "comprobante", url: "#" },
    ],
    incidents: [],
    notes: "Cliente preferencial - descuento del 4% aplicado.",
  },
  {
    id: "TXN-002",
    clientOrProvider: "Distribuidora Global MX",
    clientOrProviderEmail: "pagos@distglobal.mx",
    clientOrProviderPhone: "+52 33 9876 5432",
    type: "cobro",
    category: "Venta de productos",
    createdAt: "2024-01-20T08:00:00",
    dueDate: "2024-01-25T23:59:59",
    amount: 78500.0,
    pendingBalance: 78500.0,
    taxes: 12560.0,
    discounts: 0,
    commission: 785.0,
    status: "vencido",
    paymentMethod: "Depósito bancario",
    bank: "Banorte",
    account: "****7890",
    bankReference: "",
    operationNumber: "",
    responsiblePerson: "Carlos López",
    processedAt: "",
    timeline: [
      { id: "1", timestamp: "2024-01-20T08:00:00", event: "Transacción creada", description: "Cobro programado" },
      { id: "2", timestamp: "2024-01-20T08:30:00", event: "Factura enviada", description: "Enviada por correo" },
      { id: "3", timestamp: "2024-01-25T00:00:00", event: "Fecha de vencimiento", description: "Sin pago recibido" },
      { id: "4", timestamp: "2024-01-26T09:00:00", event: "Recordatorio enviado", description: "Primer aviso" },
    ],
    documents: [
      { id: "d1", name: "Factura CFDI-002345.pdf", type: "factura", url: "#" },
      { id: "d2", name: "Orden de compra OC-456.pdf", type: "orden_compra", url: "#" },
    ],
    incidents: [
      {
        id: "i1",
        date: "2024-01-26T10:00:00",
        type: "Pago vencido",
        cause: "Cliente no ha realizado el pago",
        status: "pendiente",
      },
    ],
    notes: "Contactar al cliente para seguimiento de pago.",
  },
  {
    id: "TXN-003",
    clientOrProvider: "Servicios Industriales Norte",
    clientOrProviderEmail: "finanzas@sindnorte.com",
    clientOrProviderPhone: "+52 81 5555 1234",
    type: "pago",
    category: "Mantenimiento",
    createdAt: "2024-01-22T15:00:00",
    dueDate: "2024-02-22T23:59:59",
    amount: 45000.0,
    pendingBalance: 22500.0,
    taxes: 7200.0,
    discounts: 0,
    commission: 450.0,
    status: "parcialmente_pagado",
    paymentMethod: "Transferencia SPEI",
    bank: "Santander",
    account: "****1234",
    bankReference: "REF-2024-005678",
    operationNumber: "OP-123456",
    responsiblePerson: "Ana Martínez",
    processedAt: "2024-01-25T11:30:00",
    timeline: [
      { id: "1", timestamp: "2024-01-22T15:00:00", event: "Transacción creada", description: "Pago parcial acordado" },
      { id: "2", timestamp: "2024-01-22T15:30:00", event: "Factura adjuntada", description: "Factura CFDI-003456" },
      { id: "3", timestamp: "2024-01-25T10:00:00", event: "Primer pago aprobado", description: "50% del total" },
      { id: "4", timestamp: "2024-01-25T11:30:00", event: "Transferencia parcial", description: "$22,500.00 enviados" },
    ],
    documents: [
      { id: "d1", name: "Factura CFDI-003456.pdf", type: "factura", url: "#" },
      { id: "d2", name: "Comprobante pago parcial.pdf", type: "comprobante", url: "#" },
    ],
    incidents: [],
    notes: "Segundo pago programado para el 15 de febrero.",
  },
  {
    id: "TXN-004",
    clientOrProvider: "Consultores Empresariales ABC",
    clientOrProviderEmail: "admin@consultoresabc.com",
    clientOrProviderPhone: "+52 55 8888 9999",
    type: "cobro",
    category: "Consultoría",
    createdAt: "2024-01-28T09:00:00",
    dueDate: "2024-02-28T23:59:59",
    amount: 95000.0,
    pendingBalance: 95000.0,
    taxes: 15200.0,
    discounts: 2500.0,
    commission: 950.0,
    status: "procesando",
    paymentMethod: "Cheque",
    bank: "HSBC",
    account: "****5678",
    bankReference: "",
    operationNumber: "",
    responsiblePerson: "Roberto Sánchez",
    processedAt: "",
    timeline: [
      { id: "1", timestamp: "2024-01-28T09:00:00", event: "Transacción creada", description: "Cobro por servicios" },
      { id: "2", timestamp: "2024-01-28T09:30:00", event: "Factura generada", description: "Factura CFDI-004567" },
      { id: "3", timestamp: "2024-01-29T14:00:00", event: "Cheque recibido", description: "En proceso de cobro" },
    ],
    documents: [
      { id: "d1", name: "Factura CFDI-004567.pdf", type: "factura", url: "#" },
      { id: "d2", name: "Copia cheque.pdf", type: "otro", url: "#" },
    ],
    incidents: [],
    notes: "Cheque en proceso de cobro bancario.",
  },
  {
    id: "TXN-005",
    clientOrProvider: "Logística Express SA",
    clientOrProviderEmail: "contabilidad@logexpress.com",
    clientOrProviderPhone: "+52 44 7777 8888",
    type: "pago",
    category: "Transporte",
    createdAt: "2024-01-10T11:00:00",
    dueDate: "2024-01-20T23:59:59",
    amount: 35000.0,
    pendingBalance: 0,
    taxes: 5600.0,
    discounts: 0,
    commission: 350.0,
    status: "devuelto",
    paymentMethod: "Transferencia bancaria",
    bank: "Citibanamex",
    account: "****9012",
    bankReference: "REF-2024-009012",
    operationNumber: "OP-567890",
    responsiblePerson: "Laura Hernández",
    processedAt: "2024-01-12T16:00:00",
    timeline: [
      { id: "1", timestamp: "2024-01-10T11:00:00", event: "Transacción creada", description: "Pago por servicios" },
      { id: "2", timestamp: "2024-01-12T15:00:00", event: "Transferencia enviada", description: "$35,000.00" },
      { id: "3", timestamp: "2024-01-12T16:00:00", event: "Transferencia devuelta", description: "Cuenta incorrecta" },
      { id: "4", timestamp: "2024-01-13T09:00:00", event: "Disputa abierta", description: "En proceso de resolución" },
    ],
    documents: [
      { id: "d1", name: "Factura CFDI-005678.pdf", type: "factura", url: "#" },
      { id: "d2", name: "Comprobante devolución.pdf", type: "comprobante", url: "#" },
    ],
    incidents: [
      {
        id: "i1",
        date: "2024-01-12T16:00:00",
        type: "Transferencia fallida",
        cause: "Cuenta destino incorrecta",
        status: "en_proceso",
      },
    ],
    notes: "Esperando nuevos datos bancarios del proveedor.",
  },
  {
    id: "TXN-006",
    clientOrProvider: "Materiales Construcción Plus",
    clientOrProviderEmail: "ventas@matconstplus.com",
    clientOrProviderPhone: "+52 22 6666 7777",
    type: "cobro",
    category: "Venta de materiales",
    createdAt: "2024-01-30T14:00:00",
    dueDate: "2024-02-05T23:59:59",
    amount: 156000.0,
    pendingBalance: 156000.0,
    taxes: 24960.0,
    discounts: 7800.0,
    commission: 1560.0,
    status: "pendiente",
    paymentMethod: "Transferencia SPEI",
    bank: "Scotiabank",
    account: "****3456",
    bankReference: "",
    operationNumber: "",
    responsiblePerson: "Pedro Ramírez",
    processedAt: "",
    timeline: [
      { id: "1", timestamp: "2024-01-30T14:00:00", event: "Transacción creada", description: "Venta de materiales" },
      { id: "2", timestamp: "2024-01-30T14:30:00", event: "Factura enviada", description: "Factura CFDI-006789" },
    ],
    documents: [
      { id: "d1", name: "Factura CFDI-006789.pdf", type: "factura", url: "#" },
      { id: "d2", name: "Orden de compra OC-321.pdf", type: "orden_compra", url: "#" },
      { id: "d3", name: "Nota de entrega.pdf", type: "otro", url: "#" },
      { id: "d4", name: "Contrato de venta.pdf", type: "otro", url: "#" },
    ],
    incidents: [],
    notes: "Cliente solicitó extensión de plazo - pendiente aprobación.",
  },
  {
    id: "TXN-007",
    clientOrProvider: "Importadora del Pacífico",
    clientOrProviderEmail: "imports@imppac.com",
    clientOrProviderPhone: "+52 66 4444 5555",
    type: "pago",
    category: "Importaciones",
    createdAt: "2024-01-05T08:00:00",
    dueDate: "2024-01-15T23:59:59",
    amount: 250000.0,
    pendingBalance: 0,
    taxes: 40000.0,
    discounts: 12500.0,
    commission: 2500.0,
    status: "entregado",
    paymentMethod: "Transferencia internacional",
    bank: "Banco Internacional",
    account: "****7890",
    bankReference: "INT-2024-001234",
    operationNumber: "OP-INT-789",
    responsiblePerson: "Diana Torres",
    processedAt: "2024-01-08T10:00:00",
    timeline: [
      { id: "1", timestamp: "2024-01-05T08:00:00", event: "Transacción creada", description: "Pago de importación" },
      { id: "2", timestamp: "2024-01-05T09:00:00", event: "Documentos adjuntados", description: "Pedimento y factura" },
      { id: "3", timestamp: "2024-01-06T11:00:00", event: "Pago aprobado", description: "Autorizado" },
      { id: "4", timestamp: "2024-01-07T14:00:00", event: "Transferencia enviada", description: "Wire transfer" },
      { id: "5", timestamp: "2024-01-08T10:00:00", event: "Confirmación recibida", description: "Pago confirmado" },
      { id: "6", timestamp: "2024-01-12T16:00:00", event: "Mercancía entregada", description: "Entrega completada" },
    ],
    documents: [
      { id: "d1", name: "Factura comercial.pdf", type: "factura", url: "#" },
      { id: "d2", name: "Pedimento aduanal.pdf", type: "otro", url: "#" },
      { id: "d3", name: "Bill of lading.pdf", type: "otro", url: "#" },
      { id: "d4", name: "Comprobante SWIFT.pdf", type: "comprobante", url: "#" },
    ],
    incidents: [],
    notes: "Importación exitosa - tiempo de entrega: 7 días.",
  },
  {
    id: "TXN-008",
    clientOrProvider: "Alimentos Frescos del Valle",
    clientOrProviderEmail: "pagos@afvalle.com",
    clientOrProviderPhone: "+52 33 2222 3333",
    type: "cobro",
    category: "Venta de alimentos",
    createdAt: "2024-01-25T07:00:00",
    dueDate: "2024-01-28T23:59:59",
    amount: 42000.0,
    pendingBalance: 0,
    taxes: 6720.0,
    discounts: 0,
    commission: 420.0,
    status: "cobrado",
    paymentMethod: "Depósito en efectivo",
    bank: "Banco Azteca",
    account: "****1122",
    bankReference: "DEP-2024-005566",
    operationNumber: "OP-DEP-123",
    responsiblePerson: "Miguel Flores",
    processedAt: "2024-01-27T12:00:00",
    timeline: [
      { id: "1", timestamp: "2024-01-25T07:00:00", event: "Transacción creada", description: "Venta de productos" },
      { id: "2", timestamp: "2024-01-25T07:30:00", event: "Factura generada", description: "Factura CFDI-008901" },
      { id: "3", timestamp: "2024-01-27T11:00:00", event: "Depósito recibido", description: "En sucursal bancaria" },
      { id: "4", timestamp: "2024-01-27T12:00:00", event: "Cobro confirmado", description: "Fondos disponibles" },
    ],
    documents: [
      { id: "d1", name: "Factura CFDI-008901.pdf", type: "factura", url: "#" },
      { id: "d2", name: "Comprobante depósito.pdf", type: "comprobante", url: "#" },
      { id: "d3", name: "Recibo de venta.pdf", type: "recibo", url: "#" },
    ],
    incidents: [],
    notes: "Cliente recurrente - pago puntual.",
  },
]

export const categories = [
  "Servicios de software",
  "Venta de productos",
  "Mantenimiento",
  "Consultoría",
  "Transporte",
  "Venta de materiales",
  "Importaciones",
  "Venta de alimentos",
]

export const paymentMethods = [
  "Transferencia bancaria",
  "Transferencia SPEI",
  "Transferencia internacional",
  "Depósito bancario",
  "Depósito en efectivo",
  "Cheque",
  "Tarjeta de crédito",
  "Tarjeta de débito",
]
