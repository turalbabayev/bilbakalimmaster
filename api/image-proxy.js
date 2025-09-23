export default async function handler(req, res) {
  try {
    const { url } = req.query;
    if (!url) {
      res.status(400).json({ error: 'Missing url query parameter' });
      return;
    }

    const target = decodeURIComponent(url);
    const response = await fetch(target);
    if (!response.ok) {
      res.status(response.status).json({ error: `Upstream error ${response.status}` });
      return;
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await response.arrayBuffer();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', contentType);
    res.status(200).send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ error: 'Image proxy failed' });
  }
}


