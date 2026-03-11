export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const SB_URL = process.env.SUPABASE_URL || 'https://ylfxjduenbvjmfbqrfzc.supabase.co';
  const SB_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsZnhqZHVlbmJ2am1mYnFyZnpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMjQ2NjcsImV4cCI6MjA4ODgwMDY2N30.aMCyh1wOm_s86aG2uMS5rlDTpmPYl_RwgdDcLSFn6_Q';
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const HDR = { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` };

  async function sendTg(chatId, text) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    });
  }

  try {
    const update = req.body;
    const msg = update?.message;
    if (!msg) return res.status(200).json({ ok: true });

    const from = msg.from;
    const text = msg.text || '';
    const chatId = msg.chat.id;

    let photoUrl = null;
    try {
      const photosR = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/getUserProfilePhotos?user_id=${from.id}&limit=1`
      );
      const photosD = await photosR.json();
      const fileId = photosD?.result?.photos?.[0]?.[0]?.file_id;
      if (fileId) {
        const fileR = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
        const fileD = await fileR.json();
        if (fileD?.result?.file_path) {
          photoUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileD.result.file_path}`;
        }
      }
    } catch (_) {}

    if (text.startsWith('/start ')) {
      const code = text.replace('/start ', '').trim();

      if (/^\d{6}$/.test(code)) {
        const name = [from.first_name, from.last_name].filter(Boolean).join(' ');
        const r = await fetch(
          `${SB_URL}/rest/v1/auth_codes?code=eq.${code}`,
          {
            method: 'PATCH',
            headers: { ...HDR, 'Prefer': 'return=minimal' },
            body: JSON.stringify({
              claimed: true,
              claimed_at: new Date().toISOString(),
              tg_id: String(from.id),
              tg_name: name,
              tg_username: from.username || null,
              tg_photo: photoUrl
            })
          }
        );

        if (r.ok) {
          await sendTg(chatId, `Привет, ${from.first_name}!\n\nТы в поездке. Вернись в приложение.`);
        } else {
          await sendTg(chatId, 'Код недействителен или истёк. Попробуй ещё раз.');
        }
      } else {
        await sendTg(chatId, 'Привет! Отсканируй QR-код в приложении Offline.Travel, чтобы присоединиться к поездке.');
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('webhook error:', e);
    return res.status(200).json({ ok: true });
  }
}
