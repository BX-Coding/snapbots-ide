export default function handler(req, res) {
  // Set CORS headers to allow all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Return a simple JSON response
  res.status(200).json({ 
    message: 'API route is working',
    method: req.method,
    query: req.query,
    path: req.url
  });
}