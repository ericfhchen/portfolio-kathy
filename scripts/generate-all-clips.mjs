import { createClient } from '@sanity/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
});

const API_SECRET = process.env.CLIP_API_SECRET;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Helper to convert time string (MM:SS.mm) to seconds
function timeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const [minutesPart, secondsPart] = timeStr.split(':');
  const minutes = parseInt(minutesPart, 10);
  const [secondsWhole, millisPart] = secondsPart.split('.');
  const seconds = parseInt(secondsWhole, 10);
  const milliseconds = millisPart ? parseInt(millisPart, 10) / 100 : 0;
  return minutes * 60 + seconds + milliseconds;
}

async function main() {
  // Query all videoProjects with hoverPreview configured
  const projects = await sanityClient.fetch(`
    *[_type == "videoProjects" && defined(coverVideo.hoverPreview.startTime) && defined(coverVideo.hoverPreview.endTime)] {
      _id,
      name,
      "coverVideoRef": coverVideo.asset.asset._ref,
      "hoverPreview": coverVideo.hoverPreview,
      "clipPlaybackId": coverVideo.clipPlaybackId
    }
  `);

  console.log(`Found ${projects.length} video projects with hover preview settings\n`);

  // Resolve Mux asset IDs
  const muxAssets = await sanityClient.fetch(`
    *[_type == "mux.videoAsset"] { _id, assetId, playbackId }
  `);

  const needsClip = projects.filter(p => !p.clipPlaybackId);
  const hasClip = projects.filter(p => p.clipPlaybackId);

  console.log(`Already have clips: ${hasClip.length}`);
  hasClip.forEach(p => console.log(`  ✓ ${p.name} (${p.clipPlaybackId})`));

  console.log(`\nNeed clips: ${needsClip.length}`);
  needsClip.forEach(p => console.log(`  → ${p.name}`));

  if (needsClip.length === 0) {
    console.log('\nAll projects already have clips!');
    return;
  }

  console.log(`\nGenerating clips sequentially (each takes ~30-60s)...\n`);

  for (const project of needsClip) {
    const muxAsset = muxAssets.find(a => a._id === project.coverVideoRef);
    if (!muxAsset?.assetId) {
      console.log(`✗ ${project.name}: Could not resolve Mux asset ID (ref: ${project.coverVideoRef})`);
      continue;
    }

    const startTime = timeToSeconds(project.hoverPreview.startTime);
    const endTime = timeToSeconds(project.hoverPreview.endTime);

    console.log(`▶ ${project.name}: generating clip [${startTime}s - ${endTime}s] from asset ${muxAsset.assetId}...`);
    const t0 = Date.now();

    try {
      const response = await fetch(`${BASE_URL}/api/generate-clip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-secret': API_SECRET,
        },
        body: JSON.stringify({
          documentId: project._id,
          assetId: muxAsset.assetId,
          startTime,
          endTime,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.log(`  ✗ Failed: ${result.error}`);
      } else {
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`  ✓ Done in ${elapsed}s → clipPlaybackId: ${result.clipPlaybackId}`);
      }
    } catch (error) {
      console.log(`  ✗ Error: ${error.message}`);
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);
