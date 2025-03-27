export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { domain, name } = req.query;
  
  if (!domain || !name) {
    return res.status(400).json({ error: 'Domain and name parameters are required' });
  }
  
  try {
    // If the domain is xeadline.com, use xead.space instead
    const targetDomain = domain === 'xeadline.com' ? 'xead.space' : domain;
    
    console.log(`NIP-05 proxy: Fetching from https://${targetDomain}/.well-known/nostr.json?name=${name}`);
    
    // Fetch the NIP-05 data from the specified domain
    const response = await fetch(`https://${targetDomain}/.well-known/nostr.json?name=${name}`);
    
    if (!response.ok) {
      console.error(`NIP-05 proxy: Fetch failed with status ${response.status}`);
      return res.status(response.status).json({ 
        error: `Failed to fetch NIP-05 data from ${domain}`,
        status: response.status
      });
    }
    
    // Get the response data
    const data = await response.json();
    console.log('NIP-05 proxy: Response data:', data);
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Return the data
    return res.status(200).json(data);
  } catch (error) {
    console.error('NIP-05 proxy: Error fetching data:', error);
    return res.status(500).json({ 
      error: 'Error fetching NIP-05 data',
      message: error.message
    });
  }
}