import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID");
    const ZAPI_TOKEN = Deno.env.get("ZAPI_TOKEN");
    const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");
    const ZAPI_PHONE_NUMBERS = Deno.env.get("ZAPI_PHONE_NUMBERS");

    if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN || !ZAPI_CLIENT_TOKEN || !ZAPI_PHONE_NUMBERS) {
      throw new Error("Missing Z-API credentials");
    }

    // Support comma, semicolon, or space as separators
    const phoneNumbers = ZAPI_PHONE_NUMBERS.split(/[,;\s]+/).map((n) => n.trim()).filter((n) => n.length > 0);
    console.log("Phone numbers parsed:", phoneNumbers);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Buscar revisões vencidas (não realizadas)
    const { data: revisoes, error } = await supabase
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

      // Verificar também por data
      if (rev.data_revisao) {
        const dataRevisao = new Date(rev.data_revisao);
        const diffDays = Math.floor((today.getTime() - dataRevisao.getTime()) / (1000 * 60 * 60 * 24));
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
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Nenhuma revisão vencida ou próxima do vencimento",
          sent: false 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Montar mensagem
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

    // Enviar para cada número
    const results = [];
    for (const phone of phoneNumbers) {
      const zapiUrl = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
      
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

      const result = await response.json();
      results.push({ phone, status: response.status, result });
    }

    console.log("WhatsApp alerts sent:", results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Alertas enviados para ${phoneNumbers.length} número(s)`,
        vencidas: vencidasList.length,
        proximasAVencer: proximasAVencer.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error sending WhatsApp alert:", error);
    const errMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
