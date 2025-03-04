export default function handler(req, res) {
    res.status(200).json({ 
      message: 'API route is working',
      method: req.method,
      query: req.query,
      headers: req.headers,
      url: req.url
    });
  }