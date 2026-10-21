// Invites or removes HOPE admins. Only an existing admin may call it.
// Deployed with verify_jwt = false (publishable/secret keys are not JWTs); the caller is authorised below.
import { createClient } from 'npm:@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const publishableKey = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')!)['default'];
const secretKey = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')!)['default'];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'Use POST.' });

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return reply(401, { error: 'Sign in as an admin first.' });

  // Who is calling, and are they an admin? (RLS lets only admins read the admins table)
  const asCaller = createClient(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await asCaller.auth.getUser(token);
  if (userError || !userData.user) return reply(401, { error: 'Your session has expired. Sign in again.' });
  const caller = userData.user;
  const { data: callerRow } = await asCaller.from('admins').select('id').eq('id', caller.id).maybeSingle();
  if (!callerRow) return reply(403, { error: 'Only admins can manage admins.' });

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: 'Send a JSON body.' });
  }

  const admin = createClient(url, secretKey, { auth: { persistSession: false } });

  if (body.action === 'invite') {
    const email = (body.email ?? '').trim().toLowerCase();
    const fullName = (body.full_name ?? '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return reply(400, { error: 'Enter a valid email address.' });
    if (!fullName) return reply(400, { error: 'Enter the admin\'s name.' });

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: body.redirect_to || undefined,
    });
    if (inviteError || !invited.user) {
      return reply(400, { error: inviteError?.message ?? 'Could not send the invite.' });
    }
    const { error: insertError } = await admin.from('admins').upsert({
      id: invited.user.id,
      email,
      full_name: fullName,
      designation: body.designation || null,
      phone: body.phone || null,
    });
    if (insertError) return reply(500, { error: insertError.message });
    return reply(200, { ok: true, id: invited.user.id });
  }

  if (body.action === 'remove') {
    const id = body.id ?? '';
    if (!id) return reply(400, { error: 'Say which admin to remove.' });
    if (id === caller.id) return reply(400, { error: 'You can\'t remove yourself. Ask another admin.' });
    const { error: deleteRowError } = await admin.from('admins').delete().eq('id', id);
    if (deleteRowError) return reply(500, { error: deleteRowError.message });
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(id);
    if (deleteUserError) return reply(500, { error: deleteUserError.message });
    return reply(200, { ok: true });
  }

  return reply(400, { error: 'Unknown action. Use invite or remove.' });
});
