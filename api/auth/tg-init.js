export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const SB_URL = process.env.SUPABASE_URL || 'https://ylfxjduenbvjmfbqrfzc.supabase.co';
  const SB_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsZnhqZHVlbmJ2am1mYnFyZnpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMjQ2NjcsImV4cCI6MjA4ODgwMDY2N30.aMCyh1wOm_s86aG2uMS5rlDTpmPYl_RwgdDcLSFn6_Q';
  const DEFAULT_TRIP_ID = process.env.DEFAULT_TRIP_ID;
  const HDR = { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` };

  try {
    const body = req.body || {};
    const tripId = body.trip_id || DEFAULT_TRIP_ID;
    const code = String(Math.floor(100000 + Math.random() * 900000));

    const r = await fetch(`${SB_URL}/rest/v1/auth_codes`, {
      method: 'POST',
      headers: { ...HDR, 'Prefer': 'return=representation' },
      body: JSON.stringify({
        code,
        trip_id: tripId,
        claimed: false,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 15 * 60000).toISOString()
      })
    });

    if (!r.ok) throw new Error('DB error');
    return res.status(200).json({ code });
  } catch (e) {
    console.error('tg-init error:', e);
    return res.status(500).json({ error: 'Failed to generate code' });
  }
}
