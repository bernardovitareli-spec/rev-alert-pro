import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Não autenticado' }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'Sessão inválida' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);

    // valida admin
    const { data: roleRow, error: roleErr } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (roleErr) return json({ error: `Falha ao validar permissão: ${roleErr.message}` }, 500);
    if (!roleRow) return json({ error: 'Apenas administradores podem sincronizar usuários' }, 403);

    const url = new URL(req.url);
    let dryRun = url.searchParams.get('dryRun') === 'true';
    if (!dryRun && (req.method === 'POST' || req.method === 'PUT')) {
      try {
        const body = await req.json();
        if (body?.dryRun === true) dryRun = true;
      } catch { /* ignore */ }
    }

    // 1) listar todos os auth.users (paginado)
    const authUsers: { id: string; email: string | null }[] = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) return json({ error: `Falha ao listar auth.users: ${error.message}` }, 500);
      const list = data?.users ?? [];
      list.forEach((u) => authUsers.push({ id: u.id, email: u.email ?? null }));
      if (list.length < perPage) break;
      page += 1;
      if (page > 50) break; // safety
    }

    // 2) profiles e roles existentes
    const { data: profilesRows, error: profErr } = await admin
      .from('profiles')
      .select('user_id');
    if (profErr) return json({ error: `Falha ao ler profiles: ${profErr.message}` }, 500);

    const { data: rolesRows, error: rolesErr2 } = await admin
      .from('user_roles')
      .select('user_id');
    if (rolesErr2) return json({ error: `Falha ao ler user_roles: ${rolesErr2.message}` }, 500);

    const profileIds = new Set((profilesRows ?? []).map((r) => r.user_id));
    const roleIds = new Set((rolesRows ?? []).map((r) => r.user_id));

    const semProfile = authUsers.filter((u) => !profileIds.has(u.id));
    const semRole = authUsers.filter((u) => !roleIds.has(u.id));

    let profilesCriados = 0;
    let rolesCriados = 0;

    if (!dryRun && (semProfile.length > 0 || semRole.length > 0)) {
      // empresa padrão
      let empresaId: string | null = null;
      const { data: mc } = await admin
        .from('empresas')
        .select('id')
        .eq('nome', 'MC Terraplenagem')
        .maybeSingle();
      if (mc?.id) {
        empresaId = mc.id;
      } else {
        const { data: anyEmp } = await admin
          .from('empresas')
          .select('id')
          .order('nome', { ascending: true })
          .limit(1)
          .maybeSingle();
        empresaId = anyEmp?.id ?? null;
      }

      if (semProfile.length > 0) {
        const rows = semProfile.map((u) => ({
          user_id: u.id,
          email: u.email,
          empresa_id: empresaId,
        }));
        const { error: insErr, count } = await admin
          .from('profiles')
          .upsert(rows, { onConflict: 'user_id', ignoreDuplicates: true, count: 'exact' });
        if (insErr) return json({ error: `Falha ao criar profiles: ${insErr.message}` }, 500);
        profilesCriados = count ?? rows.length;
      }

      if (semRole.length > 0) {
        const rows = semRole.map((u) => ({ user_id: u.id, role: 'user' as const }));
        const { error: insErr, count } = await admin
          .from('user_roles')
          .upsert(rows, { onConflict: 'user_id,role', ignoreDuplicates: true, count: 'exact' });
        if (insErr) return json({ error: `Falha ao criar roles: ${insErr.message}` }, 500);
        rolesCriados = count ?? rows.length;
      }
    }

    const totalAfterAuth = authUsers.length;
    const totalProfiles = (profilesRows ?? []).length + profilesCriados;
    const totalRoles = (rolesRows ?? []).length + rolesCriados;

    return json({
      diagnostico: {
        total_auth: totalAfterAuth,
        total_profiles: totalProfiles,
        total_roles: totalRoles,
      },
      orfaos_encontrados: {
        sem_profile: semProfile.map((u) => u.email).filter(Boolean),
        sem_role: semRole.map((u) => u.email).filter(Boolean),
      },
      correcoes_aplicadas: {
        profiles_criados: profilesCriados,
        roles_criados: rolesCriados,
      },
      dryRun,
      mensagem: dryRun
        ? `Diagnóstico: ${semProfile.length} sem perfil, ${semRole.length} sem papel.`
        : `${profilesCriados + rolesCriados} registro(s) sincronizado(s). Recarregue a página.`,
    });
  } catch (err) {
    console.error('[admin-sync-users] unexpected', err);
    return json({ error: (err as Error).message }, 500);
  }
});
