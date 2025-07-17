export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;
  const ONESIGNAL_USER_AUTH_KEY = process.env.ONESIGNAL_USER_AUTH_KEY;

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    return res.status(500).json({ error: 'OneSignal yapılandırması eksik' });
  }

  try {
    if (req.method === 'POST') {
      // Bildirim gönder
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${ONESIGNAL_REST_API_KEY}`
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          ...req.body
        })
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } else if (req.method === 'GET') {
      // Bildirim geçmişi
      const { limit = 50, offset = 0 } = req.query;
      const response = await fetch(
        `https://onesignal.com/api/v1/notifications?app_id=${ONESIGNAL_APP_ID}&limit=${limit}&offset=${offset}`,
        {
          headers: {
            'Authorization': `Key ${ONESIGNAL_REST_API_KEY}`
          }
        }
      );

      const data = await response.json();
      res.status(response.status).json(data);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('OneSignal API Error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
} 