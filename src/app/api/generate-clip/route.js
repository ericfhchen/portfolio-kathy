import Mux from '@mux/mux-node';
import { createClient } from '@sanity/client';

const mux = new Mux({
  tokenId: process.env.SANITY_STUDIO_MUX_TOKEN_ID,
  tokenSecret: process.env.SANITY_STUDIO_MUX_TOKEN_SECRET,
});

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
});

// Simple auth check via secret header
function isAuthorized(request) {
  const authHeader = request.headers.get('x-api-secret');
  return authHeader === process.env.CLIP_API_SECRET;
}

// Poll Mux asset until ready (max ~5 minutes)
async function waitForAssetReady(assetId, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    const asset = await mux.video.assets.retrieve(assetId);
    if (asset.status === 'ready') {
      // Check if static renditions are ready
      if (asset.static_renditions?.status === 'ready') {
        return asset;
      }
    }
    if (asset.status === 'errored') {
      throw new Error(`Mux asset errored: ${asset.errors?.messages?.join(', ')}`);
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  throw new Error('Mux asset timed out waiting for ready status');
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { documentId, assetId, startTime, endTime } = await request.json();

    if (!documentId || !assetId || startTime == null || endTime == null) {
      return Response.json(
        { error: 'Missing required fields: documentId, assetId, startTime, endTime' },
        { status: 400 }
      );
    }

    // Check if document already has a clip asset — delete old one
    const doc = await sanityClient.fetch(
      `*[_id == $id][0]{ "clipAssetId": coverVideo.clipAssetId }`,
      { id: documentId }
    );

    if (doc?.clipAssetId) {
      try {
        await mux.video.assets.delete(doc.clipAssetId);
        console.log(`Deleted old clip asset: ${doc.clipAssetId}`);
      } catch (e) {
        console.warn(`Failed to delete old clip asset ${doc.clipAssetId}:`, e.message);
      }
    }

    // Create new clip asset from the source asset
    const clipAsset = await mux.video.assets.create({
      input: [{
        url: `mux://assets/${assetId}`,
        start_time: startTime,
        end_time: endTime,
      }],
      mp4_support: 'standard',
      playback_policy: ['public'],
    });

    console.log(`Created clip asset: ${clipAsset.id}, waiting for ready...`);

    // Poll until ready
    const readyAsset = await waitForAssetReady(clipAsset.id);

    // Get the playback ID
    const clipPlaybackId = readyAsset.playback_ids?.[0]?.id;
    if (!clipPlaybackId) {
      throw new Error('No playback ID found on clip asset');
    }

    // Write clip info back to Sanity
    await sanityClient
      .patch(documentId)
      .set({
        'coverVideo.clipPlaybackId': clipPlaybackId,
        'coverVideo.clipAssetId': clipAsset.id,
      })
      .commit();

    console.log(`Wrote clipPlaybackId=${clipPlaybackId} to document ${documentId}`);

    return Response.json({
      success: true,
      clipAssetId: clipAsset.id,
      clipPlaybackId,
    });
  } catch (error) {
    console.error('Generate clip error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
