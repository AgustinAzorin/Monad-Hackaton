"use client"

import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { TimelineEvent } from "@/lib/data"

interface TransactionTimelineProps {
  events: TimelineEvent[]
}

export function TransactionTimeline({ events }: TransactionTimelineProps) {
  return (
    <div className="relative space-y-4">
      {/* Timeline line */}
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

      {events.map((event, index) => {
        const date = parseISO(event.timestamp)
        const isLast = index === events.length - 1

        return (
          <div key={event.id} className="relative flex gap-3 pl-6">
            {/* Dot */}
            <div
              className={`absolute left-0 w-3.5 h-3.5 rounded-full border-2 ${
                isLast
                  ? "bg-primary border-primary"
                  : "bg-background border-muted-foreground/50"
              }`}
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-foreground">
                  {event.event}
                </span>
                <span className="text-muted-foreground text-xs">
                  {format(date, "HH:mm", { locale: es })}
                </span>
              </div>
              {event.description && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {event.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                {format(date, "d MMM yyyy", { locale: es })}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
