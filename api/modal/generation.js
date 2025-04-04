// Serverless function to proxy requests to the Modal server - maintains backward compatibility
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the request body
    const body = req.body;
    
    console.log("Request body mode:", body.mode);
    
    // Determine which endpoint to use based on the mode
    let modalEndpoint;
    if (body.mode === 'hybrid') {
      // For hybrid mode, redirect to the hybrid API endpoint
      console.log("Redirecting to hybrid endpoint");
      return fetch(`${req.headers.get('x-forwarded-proto') || 'http'}://${req.headers.host}/api/modal/hybrid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }).then(response => {
        return response.json().then(data => {
          return res.status(response.status).json(data);
        });
      });
    } else {
      // For simulation mode or default, redirect to the simulation API endpoint
      console.log("Redirecting to simulation endpoint");
      return fetch(`${req.headers.get('x-forwarded-proto') || 'http'}://${req.headers.host}/api/modal/simulation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }).then(response => {
        return response.json().then(data => {
          return res.status(response.status).json(data);
        });
      });
    }
  } catch (error) {
    console.error('Error proxying to Modal server:', error);
    return res.status(500).json({ error: 'Failed to proxy request to Modal server', details: error.message });
  }
} 