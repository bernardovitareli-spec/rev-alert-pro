import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Role = 'admin' | 'apontador' | 'user';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: isAdminData, error: rolesError } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (rolesError) {
      console.error('[admin-invite-user] role check error', rolesError);
      return new Response(JSON.stringify({ error: 'Falha ao validar permissão' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!isAdminData) {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem cadastrar usuários' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? '').trim().toLowerCase();
    const nome = body.nome ? String(body.nome).trim() : undefined;
    const password = body.password ? String(body.password) : undefined;
    const rawRole = String(body.role ?? 'user').toLowerCase();
    const role: Role = (['admin', 'apontador', 'user'].includes(rawRole) ? rawRole : 'user') as Role;

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'E-mail inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!password || password.length < 8) {
      return new Response(JSON.stringify({ error: 'Senha obrigatória (mínimo 8 caracteres)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: nome ? { nome } : undefined,
    });

    if (createError) {
      const code = (createError as any)?.code;
      const msg = createError.message?.toLowerCase() ?? '';
      const isExisting = code === 'email_exists' || msg.includes('already been registered') || msg.includes('already registered');

      if (isExisting) {
        return new Response(
          JSON.stringify({ error: 'Já existe um usuário cadastrado com este e-mail.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      console.error('[admin-invite-user] create error', createError);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const newUserId = created.user?.id;

    // Atribui o papel escolhido. Se for admin/apontador, remove o 'user' default
    // criado pelo trigger handle_new_user para a UI listar o papel correto.
    if (newUserId && role !== 'user') {
      // Garante que o role exista (o trigger pode rodar antes)
      const { error: insertRoleErr } = await admin
        .from('user_roles')
        .insert({ user_id: newUserId, role });
      if (insertRoleErr && !String(insertRoleErr.message).includes('duplicate')) {
        console.error('[admin-invite-user] insert role error', insertRoleErr);
      }
      // Remove o 'user' default
      await admin.from('user_roles').delete().eq('user_id', newUserId).eq('role', 'user');
    }

    return new Response(
      JSON.stringify({
        ok: true,
        created: true,
        message: `Usuário ${email} criado como ${role}. Compartilhe a senha com ele de forma segura.`,
        user: { id: newUserId, email: created.user?.email, role },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[admin-invite-user] unexpected', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
