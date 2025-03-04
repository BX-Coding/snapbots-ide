// Serverless function to proxy requests to the Modal server
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the generation ID from the query parameters
    const { generation_id } = req.query;
    
    if (!generation_id) {
      return res.status(400).json({ error: 'Missing generation_id parameter' });
    }

    // Forward the request to the Modal server
    const modalResponse = await fetch(`https://eucalyptus--simulation-endpoint.modal.run/retrieve-code?generation_id=${generation_id}`, {
      method: 'GET',
      headers: {
        'Origin': 'https://snapbot.vercel.app'
      }
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