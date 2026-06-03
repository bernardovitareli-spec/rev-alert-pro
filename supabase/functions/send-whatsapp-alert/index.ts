import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

// CORS: por padrão libera "*" (comportamento anterior). Se ALLOWED_ORIGIN estiver
// definido (lista separada por vírgula), passa a aplicar allowlist explícita.
function buildCorsHeaders(req: Request): Record<string, string> {
  const allowedRaw = Deno.env.get("ALLOWED_ORIGIN") || "";
  const allowed = allowedRaw.split(",").map((o) => o.trim()).filter(Boolean);
  const origin = req.headers.get("origin") || "";
  const allowOrigin =
    allowed.length === 0 ? "*" : allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function jsonResponse(
  body: unknown,
  status: number,
  cors: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

interface VeiculoData {
  placa_serie: string;
  km_atual: number | null;
  hora_atual: number | null;
  empresa: { nome: string } | null;
}

interface TipoRevisaoData {
  nome: string;
}

interface Revision {
  id: string;
  veiculo_id: string;
  tipo_revisao_id: string;
  data_revisao: string | null;
  km_revisao: number | null;
  hora_revisao: number | null;
  intervalo: number;
  unidade: "Km" | "Hr";
  status_execucao: string;
  veiculo: VeiculoData | null;
  tipo_revisao: TipoRevisaoData | null;
}

// Rate limit simples por IP via Deno KV: 5 chamadas / hora.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

async function checkRateLimit(ip: string): Promise<boolean> {
  try {
    const kv = await Deno.openKv();
    const key = ["wa_alert_rl", ip];
    const now = Date.now();
    const entry = await kv.get<{ count: number; resetAt: number }>(key);
    const current = entry.value;

    if (!current || current.resetAt < now) {
      await kv.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS }, {
        expireIn: RATE_LIMIT_WINDOW_MS,
      });
      return true;
    }
    if (current.count >= RATE_LIMIT_MAX) return false;
    await kv.set(key, { count: current.count + 1, resetAt: current.resetAt }, {
      expireIn: Math.max(1, current.resetAt - now),
    });
    return true;
  } catch (e) {
    console.error("rate-limit kv error", e);
    // Fail-open para não derrubar a função se KV indisponível.
    return true;
  }
}

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido" }, 405, cors);
  }

  try {
    // 1) Autenticação obrigatória
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return jsonResponse({ error: "Não autorizado" }, 401, cors);
    }
    const jwt = authHeader.slice("Bearer ".length).trim();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userErr } = await authClient.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return jsonResponse({ error: "Não autorizado" }, 401, cors);
    }
    const userId = userData.user.id;

    // 2) Checar role admin
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow, error: roleErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr || !roleRow) {
      return jsonResponse({ error: "Não autorizado" }, 401, cors);
    }

    // 3) Rate limit por IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    const allowed = await checkRateLimit(ip);
    if (!allowed) {
      return jsonResponse(
        { error: "Limite de chamadas atingido. Tente novamente mais tarde." },
        429,
        cors,
      );
    }

    // 4) Lógica de envio
    const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID");
    const ZAPI_TOKEN = Deno.env.get("ZAPI_TOKEN");
    const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");
    const ZAPI_PHONE_NUMBERS = Deno.env.get("ZAPI_PHONE_NUMBERS");

    if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN || !ZAPI_CLIENT_TOKEN || !ZAPI_PHONE_NUMBERS) {
      throw new Error("Missing Z-API credentials");
    }

    const phoneNumbers = ZAPI_PHONE_NUMBERS.split(/[,;\s]+/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    const { data: revisoes, error } = await admin
      .from("revisoes")
      .select(`
        id,
        veiculo_id,
        tipo_revisao_id,
        data_revisao,
        km_revisao,
        hora_revisao,
        intervalo,
        unidade,
        status_execucao,
        veiculo:veiculos(placa_serie, km_atual, hora_atual, empresa:empresas(nome)),
        tipo_revisao:tipos_revisao(nome)
      `)
      .eq("status_execucao", "nao_realizada");

    if (error) {
      throw error;
    }

    const today = new Date();
    const vencidasList: string[] = [];
    const proximasAVencer: string[] = [];

    for (const rev of ((revisoes || []) as unknown) as Revision[]) {
      const veiculo = rev.veiculo;
      if (!veiculo) continue;

      const placa = veiculo.placa_serie;
      const empresa = veiculo.empresa?.nome || "Sem empresa";
      const tipoRevisao = rev.tipo_revisao?.nome || "Revisão";

      let isVencida = false;
      let proximaEmDias: number | null = null;
      let infoExtra = "";

      if (rev.unidade === "Km") {
        const kmAtual = veiculo.km_atual || 0;
        const kmRevisao = rev.km_revisao || 0;
        const proxKm = kmRevisao + rev.intervalo;
        const kmRestante = proxKm - kmAtual;

        if (kmRestante <= 0) {
          isVencida = true;
          infoExtra = `(${Math.abs(kmRestante).toLocaleString("pt-BR")} km excedidos)`;
        } else if (kmRestante <= 500) {
          proximaEmDias = kmRestante;
          infoExtra = `(faltam ${kmRestante.toLocaleString("pt-BR")} km)`;
        }
      } else if (rev.unidade === "Hr") {
        const horaAtual = veiculo.hora_atual || 0;
        const horaRevisao = rev.hora_revisao || 0;
        const proxHora = horaRevisao + rev.intervalo;
        const horasRestantes = proxHora - horaAtual;

        if (horasRestantes <= 0) {
          isVencida = true;
          infoExtra = `(${Math.abs(horasRestantes)} horas excedidas)`;
        } else if (horasRestantes <= 50) {
          proximaEmDias = horasRestantes;
          infoExtra = `(faltam ${horasRestantes} horas)`;
        }
      }

      if (rev.data_revisao) {
        const dataRevisao = new Date(rev.data_revisao);
        const diffDays = Math.floor(
          (today.getTime() - dataRevisao.getTime()) / (1000 * 60 * 60 * 24),
        );
        const diasRestantes = rev.intervalo - diffDays;

        if (diasRestantes <= 0 && !isVencida) {
          isVencida = true;
          infoExtra = `(${Math.abs(diasRestantes)} dias vencidos)`;
        } else if (diasRestantes <= 7 && diasRestantes > 0 && !proximaEmDias) {
          proximaEmDias = diasRestantes;
          infoExtra = `(vence em ${diasRestantes} dias)`;
        }
      }

      if (isVencida) {
        vencidasList.push(`🔴 *${placa}* - ${tipoRevisao} ${infoExtra}\n   📍 ${empresa}`);
      } else if (proximaEmDias !== null) {
        proximasAVencer.push(`🟡 *${placa}* - ${tipoRevisao} ${infoExtra}\n   📍 ${empresa}`);
      }
    }

    if (vencidasList.length === 0 && proximasAVencer.length === 0) {
      return jsonResponse(
        {
          success: true,
          message: "Nenhuma revisão vencida ou próxima do vencimento",
          sent: false,
        },
        200,
        cors,
      );
    }

    const dataHora = today.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    let mensagem = `📋 *ALERTA DE REVISÕES - FROTA*\n`;
    mensagem += `📅 ${dataHora}\n\n`;

    if (vencidasList.length > 0) {
      mensagem += `⚠️ *REVISÕES VENCIDAS (${vencidasList.length}):*\n\n`;
      mensagem += vencidasList.join("\n\n");
      mensagem += "\n\n";
    }

    if (proximasAVencer.length > 0) {
      mensagem += `⏰ *PRÓXIMAS A VENCER (${proximasAVencer.length}):*\n\n`;
      mensagem += proximasAVencer.join("\n\n");
    }

    mensagem += "\n\n_Mensagem automática do Sistema de Gestão de Frota_";

    const results: Array<{ index: number; ok: boolean; status: number | null; error?: string }> = [];
    for (let i = 0; i < phoneNumbers.length; i++) {
      const phone = phoneNumbers[i];
      const zapiUrl = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;

      try {
        const response = await fetch(zapiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Client-Token": ZAPI_CLIENT_TOKEN,
          },
          body: JSON.stringify({
            phone: phone.replace(/\D/g, ""),
            message: mensagem,
          }),
        });

        const ok = response.status >= 200 && response.status < 300;
        if (!ok) {
          // Loga corpo internamente para diagnóstico, sem expor ao cliente.
          const bodyText = await response.text().catch(() => "");
          console.error(
            `Z-API falhou para destinatário #${i}: status=${response.status} body=${bodyText.slice(0, 500)}`,
          );
        }
        results.push({ index: i, ok, status: response.status });
      } catch (err) {
        console.error(`Z-API exceção para destinatário #${i}:`, err);
        results.push({
          index: i,
          ok: false,
          status: null,
          error: "network_error",
        });
      }
    }

    const sucessos = results.filter((r) => r.ok).length;
    const falhas = results.length - sucessos;

    console.log(
      `WhatsApp alerts dispatch summary: total=${results.length} ok=${sucessos} fail=${falhas}`,
    );

    return jsonResponse(
      {
        success: falhas === 0,
        message: `Alertas enviados: ${sucessos} sucesso(s), ${falhas} falha(s) de ${results.length} destinatário(s)`,
        vencidas: vencidasList.length,
        proximasAVencer: proximasAVencer.length,
        totalDestinatarios: results.length,
        sucessos,
        falhas,
        // Apenas índice e status — sem números de telefone.
        detalhes: results,
      },
      200,
      cors,
    );
  } catch (error: unknown) {
    // Loga internamente, devolve mensagem genérica.
    console.error("send-whatsapp-alert error:", error);
    return jsonResponse({ error: "Erro ao processar alerta" }, 500, cors);
  }
});
