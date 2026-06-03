import { Bell, AlertTriangle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { useState } from "react";

export function NotificationsDropdown() {
  const { items, unreadCount, markAllRead, enabled } = useNotifications();
  const [open, setOpen] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && unreadCount > 0) {
      // Mark as read shortly after opening
      setTimeout(markAllRead, 600);
    }
  };

  const visibleCount = enabled ? unreadCount : 0;

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notificações${visibleCount > 0 ? ` (${visibleCount} não lidas)` : ""}`}
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {visibleCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center"
              aria-hidden="true"
            >
              {visibleCount > 99 ? "99+" : visibleCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-foreground">Notificações</p>
            <p className="text-xs text-muted-foreground">
              {enabled
                ? `${items.length} ${items.length === 1 ? "alerta" : "alertas"} ativos`
                : "Notificações desativadas"}
            </p>
          </div>
          {items.length > 0 && enabled && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={markAllRead}
            >
              Marcar lidas
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-80">
          {!enabled ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Ative as notificações em{" "}
              <Link to="/configuracoes" className="text-primary underline">
                Configurações
              </Link>
              .
            </div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma revisão crítica ou em atenção no momento.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.slice(0, 20).map((it) => {
                const Icon = it.status === "critical" ? AlertTriangle : Clock;
                const colorClass =
                  it.status === "critical"
                    ? "text-[hsl(var(--status-critical))]"
                    : "text-[hsl(var(--status-warning))]";
                return (
                  <li key={it.id}>
                    <Link
                      to={`/veiculos/${it.veiculoId}`}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-accent/40 transition-colors"
                    >
                      <Icon
                        className={`h-4 w-4 mt-0.5 shrink-0 ${colorClass}`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {it.placa} · {it.tipoNome}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {it.status === "critical"
                            ? `Vencida há ${Math.abs(it.faltam)} ${it.unidade}`
                            : `Faltam ${it.faltam} ${it.unidade}`}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        {items.length > 0 && enabled && (
          <div className="border-t border-border px-4 py-2 text-center">
            <Link
              to="/veiculos"
              onClick={() => setOpen(false)}
              className="text-xs text-primary hover:underline"
            >
              Ver todos os veículos
            </Link>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
