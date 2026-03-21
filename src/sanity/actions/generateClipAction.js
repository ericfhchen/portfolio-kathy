import { useState } from 'react';
import { useClient } from 'sanity';

// Helper to convert time string (MM:SS.mm) to seconds
const timeToSeconds = (timeStr) => {
  if (!timeStr) return 0;
  const [minutesPart, secondsPart] = timeStr.split(':');
  const minutes = parseInt(minutesPart, 10);
  const [secondsWhole, millisPart] = secondsPart.split('.');
  const seconds = parseInt(secondsWhole, 10);
  const milliseconds = millisPart ? parseInt(millisPart, 10) / 100 : 0;
  return minutes * 60 + seconds + milliseconds;
};

export function useGenerateClipAction(props) {
  const { id, type, published, draft } = props;
  const client = useClient({ apiVersion: '2024-01-01' });
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState('');

  if (type !== 'videoProjects') return null;

  const doc = draft || published;
  const hoverPreview = doc?.coverVideo?.hoverPreview;
  const coverVideoRef = doc?.coverVideo?.asset?.asset?._ref;

  // Only show the action if hover preview is configured
  if (!hoverPreview?.startTime || !hoverPreview?.endTime || !coverVideoRef) {
    return null;
  }

  return {
    label: generating ? status || 'Generating clip...' : 'Generate Hover Clip',
    tone: 'primary',
    disabled: generating,
    onHandle: async () => {
      setGenerating(true);
      setStatus('Resolving Mux asset...');

      try {
        // Resolve the Mux asset ID from the reference
        const muxAsset = await client.fetch(
          `*[_id == $ref][0]{ _id, assetId, playbackId }`,
          { ref: coverVideoRef }
        );

        if (!muxAsset?.assetId) {
          throw new Error('Could not resolve Mux asset ID from cover video reference');
        }

        const startTime = timeToSeconds(hoverPreview.startTime);
        const endTime = timeToSeconds(hoverPreview.endTime);

        setStatus('Creating clip (this takes 30-60s)...');

        const response = await fetch('/api/generate-clip', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-secret': process.env.SANITY_STUDIO_CLIP_API_SECRET || '',
          },
          body: JSON.stringify({
            documentId: id,
            assetId: muxAsset.assetId,
            startTime,
            endTime,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to generate clip');
        }

        setStatus(`Done! Clip ID: ${result.clipPlaybackId}`);
        setTimeout(() => {
          setGenerating(false);
          setStatus('');
        }, 3000);
      } catch (error) {
        setStatus(`Error: ${error.message}`);
        setTimeout(() => {
          setGenerating(false);
          setStatus('');
        }, 5000);
      }
    },
  };
}
