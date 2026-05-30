import type {
  Transaction,
  TransactionStatus,
  TransactionType,
  TimelineEvent,
  Document as TxDocument,
} from "@/lib/data";
import type { TransaccionConDetalle } from "@/types/cuenta";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

// Plazo por defecto (días) usado para derivar una fecha de vencimiento, ya que
// el backend todavía no maneja vencimientos. Es un valor mock/derivado.
const DEFAULT_TERM_DAYS = 30;

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

/**
 * Dirección del dinero desde mi perspectiva:
 * - PAGO + POR_MI (yo pago) → sale plata → "pago"
 * - PAGO + HACIA_MI (me pagan) → entra plata → "cobro"
 * - FACTURA + POR_MI (yo facturo) → espero cobrar → "cobro"
 * - FACTURA + HACIA_MI (me facturan) → debo pagar → "pago"
 */
function mapType(tx: TransaccionConDetalle): TransactionType {
  const esCobro =
    (tx.tipo === "PAGO" && tx.direccion === "HACIA_MI") ||
    (tx.tipo === "FACTURA" && tx.direccion === "POR_MI");
  return esCobro ? "cobro" : "pago";
}

function mapStatus(
  tx: TransaccionConDetalle,
  type: TransactionType,
): TransactionStatus {
  if (tx.estado === "PENDIENTE") return "pendiente";
  return type === "cobro" ? "cobrado" : "pagado";
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function buildTimeline(tx: TransaccionConDetalle): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      id: "1",
      timestamp: tx.created_at,
      event:
        tx.tipo === "FACTURA" ? "Factura generada" : "Transacción creada",
      description: tx.descripcion ?? undefined,
    },
  ];

  if (tx.mercado_pago_payment_id) {
    events.push({
      id: "2",
      timestamp: tx.updated_at,
      event: "Pago vía Mercado Pago",
      description: `Comprobante #${tx.mercado_pago_payment_id}`,
    });
  }

  if (tx.estado === "COMPLETADO") {
    events.push({
      id: "3",
      timestamp: tx.updated_at,
      event: "Transacción completada",
    });
  }

  return events;
}

/**
 * Mapea una transacción real del backend al modelo que consume la página de
 * transacciones. Los campos con respaldo en el backend son reales; el resto
 * (teléfono, categoría, vencimiento, impuestos, banco, incidencias, etc.)
 * son valores mock/derivados porque el backend aún no los expone.
 */
export function mapTransaccion(tx: TransaccionConDetalle): Transaction {
  const type = mapType(tx);
  const status = mapStatus(tx, type);
  const nombre = tx.contraparte.nombre || tx.contraparte.email || "Usuario";

  const documents: TxDocument[] = tx.factura_url
    ? [
        {
          id: `${tx.id}-factura`,
          name: "Factura.pdf",
          type: "factura",
          url: tx.factura_url,
        },
      ]
    : [];

  return {
    // ─── Datos reales del backend ───
    id: tx.id,
    clientOrProvider: nombre,
    clientOrProviderEmail: tx.contraparte.email,
    type,
    createdAt: tx.created_at,
    amount: Number(tx.monto),
    pendingBalance: tx.estado === "PENDIENTE" ? Number(tx.monto) : 0,
    status,
    paymentMethod: tx.mercado_pago_payment_id
      ? "Mercado Pago"
      : "Transferencia",
    operationNumber: tx.mercado_pago_payment_id ?? "",
    processedAt: tx.estado === "COMPLETADO" ? tx.updated_at : "",
    timeline: buildTimeline(tx),
    documents,
    notes: tx.descripcion ?? "",

    // ─── Mock / derivado (sin respaldo en el backend) ───
    clientOrProviderPhone: "No disponible",
    category: tx.tipo === "FACTURA" ? "Factura" : "Pago directo",
    dueDate: addDays(tx.created_at, DEFAULT_TERM_DAYS),
    taxes: 0,
    discounts: 0,
    commission: 0,
    bank: tx.mercado_pago_payment_id ? "Mercado Pago" : "—",
    account: "—",
    bankReference: "",
    responsiblePerson: tx.contraparte.dni ? `DNI ${tx.contraparte.dni}` : "",
    incidents: [],
  };
}

export async function fetchMisTransacciones(): Promise<Transaction[]> {
  const token = getToken();
  if (!token) {
    throw new Error("Sesión expirada. Iniciá sesión nuevamente.");
  }

  const res = await fetch(
    `${BACKEND_URL}/cuentas-corrientes/mis-transacciones`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!res.ok) {
    const body = await res
      .json()
      .catch(() => ({ message: "Error del servidor" }));
    const message = Array.isArray(body.message)
      ? body.message.join(", ")
      : body.message;
    throw new Error(message ?? "Error del servidor");
  }

  const data: TransaccionConDetalle[] = await res.json();
  return data.map(mapTransaccion);
}
