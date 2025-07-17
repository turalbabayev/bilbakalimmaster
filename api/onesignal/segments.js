export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

  console.log('Segments API - Environment variables check:');
  console.log('ONESIGNAL_APP_ID:', ONESIGNAL_APP_ID ? 'EXISTS' : 'MISSING');
  console.log('ONESIGNAL_REST_API_KEY:', ONESIGNAL_REST_API_KEY ? 'EXISTS' : 'MISSING');

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.error('Missing environment variables');
    return res.status(500).json({ error: 'OneSignal yapılandırması eksik' });
  }

  try {
    const url = `https://onesignal.com/api/v1/apps/${ONESIGNAL_APP_ID}/segments`;
    console.log('Segments API Request URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Key ${ONESIGNAL_REST_API_KEY}`
      }
    });

    console.log('Segments API Response Status:', response.status);
    
    const data = await response.json();
    console.log('Segments API Response Data:', data);
    
    res.status(response.status).json(data);
  } catch (error) {
    console.error('OneSignal API Error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
} 