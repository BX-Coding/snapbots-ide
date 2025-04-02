// Serverless function to proxy requests to the Modal server
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the request body
    const body = req.body;
    
    // Get the Modal endpoint from environment variables
    const modalEndpoint = process.env.SNAPBOT_MODAL_ENDPOINT || 'https://eucalyptus--snapbot-simulation.modal.run/';
    
    // Forward the request to the Modal server
    const modalResponse = await fetch(`${modalEndpoint}generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://snapbot.vercel.app'
      },
      body: JSON.stringify(body),
    });

    // Check if the response is JSON
    const contentType = modalResponse.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await modalResponse.json();
      return res.status(modalResponse.status).json(data);
    } else {
      const text = await modalResponse.text();
      return res.status(modalResponse.status).send(text);
    }
  } catch (error) {
    console.error('Error proxying to Modal server:', error);
    return res.status(500).json({ error: 'Failed to proxy request to Modal server', details: error.message });
  }
} 