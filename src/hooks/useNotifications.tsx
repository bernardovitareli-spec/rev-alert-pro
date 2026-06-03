import { useEffect, useMemo, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVeiculosComRevisoes } from "@/hooks/useFleetData";

const STORAGE_KEY = "mc:notifications:last_read";
const PREF_KEY = "mc:notifications:enabled";

export interface NotificationItem {
  id: string;
  veiculoId: string;
  placa: string;
  tipoNome: string;
  status: "critical" | "warning";
  proxima?: string | null;
  createdAt: string;
}

export function getNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(PREF_KEY);
  return v === null ? true : v === "true";
}

export function setNotificationsEnabled(enabled: boolean) {
  localStorage.setItem(PREF_KEY, String(enabled));
  window.dispatchEvent(new Event("mc:notif-pref-change"));
}

export function useNotifications() {
  const queryClient = useQueryClient();
  const { data: veiculos } = useVeiculosComRevisoes();
  const [lastRead, setLastRead] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem(STORAGE_KEY) || 0);
  });
  const [enabled, setEnabled] = useState<boolean>(getNotificationsEnabled);

  useEffect(() => {
    const onPref = () => setEnabled(getNotificationsEnabled());
    window.addEventListener("mc:notif-pref-change", onPref);
    return () => window.removeEventListener("mc:notif-pref-change", onPref);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("revisoes-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "revisoes" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["revisoes"] });
          queryClient.invalidateQueries({ queryKey: ["veiculos"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const items = useMemo<NotificationItem[]>(() => {
    if (!veiculos) return [];
    const list: NotificationItem[] = [];
    for (const v of veiculos) {
      for (const r of v.revisoes || []) {
        const status = (r as { status?: string }).status;
        if (status === "critical" || status === "warning") {
          list.push({
            id: r.id,
            veiculoId: v.id,
            placa: v.placa_serie,
            tipoNome: r.tipo_revisao?.nome || "Revisão",
            status,
            proxima: (r as { data_proxima?: string | null }).data_proxima ?? null,
            createdAt: r.created_at || new Date().toISOString(),
          });
        }
      }
    }
    // Critical first
    list.sort((a, b) => {
      if (a.status !== b.status) return a.status === "critical" ? -1 : 1;
      return (a.proxima || "").localeCompare(b.proxima || "");
    });
    return list;
  }, [veiculos]);

  const unreadCount = useMemo(() => {
    if (!enabled) return 0;
    return items.filter((it) => new Date(it.createdAt).getTime() > lastRead).length;
  }, [items, lastRead, enabled]);

  const markAllRead = useCallback(() => {
    const now = Date.now();
    localStorage.setItem(STORAGE_KEY, String(now));
    setLastRead(now);
  }, []);

  return { items, unreadCount, markAllRead, enabled };
}
