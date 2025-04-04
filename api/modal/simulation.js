// Serverless function to proxy requests to the Simulation Modal server
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the request body
    const body = req.body;
    
    console.log("Processing simulation mode request");
    console.log("Request body:", JSON.stringify(body).substring(0, 200) + "..."); // Truncate for log readability
    
    // Get the simulation endpoint from environment variables
    const modalEndpoint = process.env.SNAPBOT_SIMULATION_MODAL_ENDPOINT;
    
    if (!modalEndpoint) {
      console.error("Missing SNAPBOT_SIMULATION_MODAL_ENDPOINT environment variable");
      return res.status(500).json({ 
        error: 'Simulation endpoint not configured',
        details: 'Missing SNAPBOT_SIMULATION_MODAL_ENDPOINT environment variable'
      });
    }

    console.log("Using simulation endpoint:", modalEndpoint);
    
    // Ensure the endpoint ends with a slash if needed
    const formattedEndpoint = modalEndpoint.endsWith('/') ? modalEndpoint : modalEndpoint + '/';
    const generationUrl = `${formattedEndpoint}generation`;
    
    console.log("Full generation URL:", generationUrl);
    
    // Forward the request to the Modal server
    const modalResponse = await fetch(generationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://snapbot.vercel.app'
      },
      body: JSON.stringify(body),
    });

    // Check if the response is JSON
    const contentType = modalResponse.headers.get('content-type');
    console.log("Response status:", modalResponse.status, "Content-Type:", contentType);
    
    if (contentType && contentType.includes('application/json')) {
      const data = await modalResponse.json();
      return res.status(modalResponse.status).json(data);
    } else {
      const text = await modalResponse.text();
      console.error("Non-JSON response:", text.substring(0, 200) + "..."); // Truncate for log readability
      return res.status(modalResponse.status).send(text);
    }
  } catch (error) {
    console.error('Error proxying to Simulation Modal server:', error);
    return res.status(500).json({ error: 'Failed to proxy request to Simulation Modal server', details: error.message });
  }
} 