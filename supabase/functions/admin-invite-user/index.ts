import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
      return new Response(JSON.stringify({ error: 'Apenas administradores podem convidar usuários' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? '').trim().toLowerCase();
    const nome = body.nome ? String(body.nome).trim() : undefined;

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'E-mail inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const redirectTo = req.headers.get('origin')
      ? `${req.headers.get('origin')}/reset-password`
      : undefined;

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: nome ? { nome } : undefined,
      redirectTo,
    });

    if (inviteError) {
      const code = (inviteError as any)?.code;
      const isExisting = code === 'email_exists' || inviteError.message?.toLowerCase().includes('already been registered');

      if (isExisting) {
        // Usuário já existe — enviar link de recuperação de senha como reconvite
        const { error: resetError } = await admin.auth.resetPasswordForEmail(email, { redirectTo });
        if (resetError) {
          console.error('[admin-invite-user] reset error', resetError);
          return new Response(JSON.stringify({ error: 'Usuário já cadastrado e falha ao reenviar link: ' + resetError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(
          JSON.stringify({ ok: true, alreadyExisted: true, message: 'Usuário já cadastrado. Um link para redefinir a senha foi enviado para o e-mail.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      console.error('[admin-invite-user] invite error', inviteError);
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, user: { id: invited.user?.id, email: invited.user?.email } }),
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
