const { createClient } = require('@sanity/client'); 

const client = createClient({ 
  projectId: 'k2z5i1vx', 
  dataset: 'production', 
  apiVersion: '2023-05-03', 
  useCdn: false 
}); 

async function main() { 
  try { 
    const result = await client.fetch('*[_type == "mux.videoAsset"]'); 
    // Data fetched successfully
  } catch (err) { 
    // Error handling silently
  } 
} 

main();
