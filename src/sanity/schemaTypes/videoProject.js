import {defineField, defineType} from 'sanity'
import Mux from '@mux/mux-player-react'

// Helper function to convert time string to seconds
const timeToSeconds = (timeStr) => {
  if (!timeStr) return 0;
  const [minutes, seconds] = timeStr.split(':').map(Number);
  return minutes * 60 + seconds;
};

export const videoProjects = defineType({
  name: 'videoProjects',
  title: 'Video Projects',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      type: 'string',
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {
        source: 'name',
        maxLength: 96,
      },
    }),
    defineField({
      name: 'client',
      title: 'Client',
      type: 'reference',
      to: [{type: 'clients'}],
      description: 'Select the client for this project',
    }),
    defineField({
      name: 'projectTagline',
      title: 'Project Tagline',
      type: 'string',
      description: 'This will be displayed below the client name on projects. i.e. "Social Campaign"',
    }),
    defineField({
      name: 'coverImage',
      type: 'image',
    }),
    defineField({
      name: 'credits',
      type: 'array',
      of: [{type: 'block'}]
    }),

    // Video Field 
    defineField({
      name: 'video',
      title: 'Project Video',
      type: 'object',
      fields: [
        {
          name: 'asset',
          title: 'Video',
          type: 'mux.video',
          description: 'Upload a video file or provide a URL to a video file.',
          options: {
            hotspot: true,
            storeOriginalFilename: true
          }
        },
        {
          name: 'muxPlaybackId',
          title: 'MUX Playback ID (Read Only)',
          type: 'string',
          readOnly: true,
          description: 'This will show the MUX playback ID if available',
          hidden: ({ parent }) => !parent?.asset?.playbackId,
          options: {
            source: 'asset.playbackId'
          }
        },
        {
          name: 'assetDebug',
          title: 'Video Asset Debug (Read-only)',
          type: 'string',
          readOnly: true,
          description: 'For debugging purposes only',
          initialValue: 'Check asset value',
          // This is used to show the actual asset data in the studio
          hidden: ({ parent }) => !parent?.asset,
        },
        {
          name: 'hoverPreview',
          title: 'Hover Preview Settings',
          type: 'object',
          description: 'Recommended time frame for hover preview is 2 seconds',
          fields: [
            {
              name: 'startTime',
              title: 'Preview Start Time (MM:SS.mm)',
              type: 'string',
              initialValue: '00:00.00',
              validation: Rule => Rule
                .custom((time) => {
                  if (!time) return true;
                  const timeRegex = /^[0-5]?[0-9]:[0-5][0-9]\.[0-9]{2}$/;
                  if (!timeRegex.test(time)) {
                    return 'Time must be in format MM:SS.mm (e.g., 00:05.00)';
                  }
                  return true;
                })
            },
            {
              name: 'endTime',
              title: 'Preview End Time (MM:SS.mm)',
              type: 'string',
              initialValue: '00:05.00',
              validation: Rule => Rule
                .custom((endTime, context) => {
                  if (!endTime) return true;
                  const timeRegex = /^[0-5]?[0-9]:[0-5][0-9]\.[0-9]{2}$/;
                  if (!timeRegex.test(endTime)) {
                    return 'Time must be in format MM:SS.mm (e.g., 00:05.00)';
                  }
                  
                  const startTime = context.parent?.startTime;
                  if (startTime && timeToSeconds(endTime) <= timeToSeconds(startTime)) {
                    return 'End time must be greater than start time';
                  }
                  return true;
                })
            }
          ],
          preview: {
            select: {
              playbackId: 'asset.playbackId',
              startTime: 'hoverPreview.startTime',
              endTime: 'hoverPreview.endTime'
            },
            prepare(selection) {
              return {
                title: 'Hover Preview',
                media: selection.playbackId ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <Mux
                      playbackId={selection.playbackId}
                      streamType="on-demand"
                      autoPlay={true}
                      muted={true}
                      loop={true}
                      startTime={timeToSeconds(selection.startTime) || 0}
                      endTime={timeToSeconds(selection.endTime)}
                      style={{ width: '100%', height: '100%' }}
                    />
                  </div>
                ) : null
              }
            }
          }
        }
      ]
    })
  ],
  preview: {
    select: {
      title: 'name',
      media: 'video.asset'
    }
  }
})