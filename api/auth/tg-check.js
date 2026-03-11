export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const SB_URL = process.env.SUPABASE_URL || 'https://ylfxjduenbvjmfbqrfzc.supabase.co';
  const SB_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsZnhqZHVlbmJ2am1mYnFyZnpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMjQ2NjcsImV4cCI6MjA4ODgwMDY2N30.aMCyh1wOm_s86aG2uMS5rlDTpmPYl_RwgdDcLSFn6_Q';
  const HDR = { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` };

  const code = req.query.code;
  if (!code) return res.status(400).json({ error: 'Missing code' });

  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/auth_codes?code=eq.${code}&select=*`,
      { headers: HDR }
    );
    const rows = await r.json();
    const row = rows?.[0];

    if (!row) return res.status(200).json({ claimed: false });

    if (row.claimed && row.tg_id) {
      // Ensure trip_members entry exists
      const tripId = row.trip_id;
      if (tripId) {
        await fetch(`${SB_URL}/rest/v1/members`, {
          method: 'POST',
          headers: { ...HDR, 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            trip_id: tripId,
            tg_id: row.tg_id,
            tg_name: row.tg_name,
            tg_username: row.tg_username,
            tg_photo: row.tg_photo,
            display_name: row.tg_name,
            role: 'participant',
            joined_at: new Date().toISOString()
          })
        }).catch(() => {}); // ignore if already exists (unique constraint)
      }

      return res.status(200).json({
        claimed: true,
        user: {
          tgId: row.tg_id,
          name: row.tg_name,
          username: row.tg_username,
          photo: row.tg_photo,
          tripId: row.trip_id
        }
      });
    }

    return res.status(200).json({ claimed: false });
  } catch (e) {
    console.error('tg-check error:', e);
    return res.status(500).json({ error: 'Check failed' });
  }
}
