// Script to set showInSelectedClients=true for all existing clients
const { createClient } = require('@sanity/client');
require('dotenv').config();

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN, // Need a write token for this
  apiVersion: '2023-05-03',
  useCdn: false
});

async function setClientVisibility() {
  try {
    // Get all clients
    const clients = await client.fetch(`*[_type == "clients"]{_id, title}`);
    
    // Update each client to have showInSelectedClients=true
    const updates = clients.map(client => {
      return {
        _id: client._id,
        showInSelectedClients: true
      };
    });
    
    // Perform the patch operation
    if (updates.length > 0) {
      for (const update of updates) {
        await client
          .patch(update._id)
          .set({ showInSelectedClients: true })
          .commit();
      }
    }
  } catch (error) {
    // Error handling silently
  }
}

setClientVisibility(); 