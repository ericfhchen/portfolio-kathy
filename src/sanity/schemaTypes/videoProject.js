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
  orderings: [
    {
      title: 'Manual Order',
      name: 'orderingAsc',
      by: [
        {field: 'orderRank', direction: 'asc'}
      ]
    }
  ],
  fields: [
    defineField({
      name: 'name',
      type: 'string',
    }),
    defineField({
      name: 'orderRank',
      title: 'Order Rank',
      type: 'string',
      hidden: true,
    }),
    defineField({
      name: 'featured',
      title: 'Featured Project',
      type: 'boolean',
      description: 'Toggle to feature this project in the bottom carousel',
      initialValue: false,
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
      name: 'credits',
      type: 'array',
      of: [{type: 'block'}]
    }),
    
    // Video Gallery Field - Simplified to just contain videos
    defineField({
      name: 'videoGallery',
      title: 'Video Gallery',
      description: 'Add videos for this project.',
      type: 'array',
      of: [
        {
          type: 'object',
          title: 'Gallery Video',
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
              name: 'caption',
              title: 'Caption',
              type: 'string',
              description: 'Optional caption for this video'
            }
          ],
          preview: {
            select: {
              playbackId: 'asset.playbackId',
              title: 'caption'
            },
            prepare({playbackId, title}) {
              return {
                title: title || 'Gallery Video',
                media: playbackId 
                  ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=0` 
                  : undefined
              }
            }
          }
        }
      ],
      options: {
        layout: 'grid'
      }
    }),
    
    // New dedicated Cover Video field
    defineField({
      name: 'coverVideo',
      title: 'Cover Video Settings',
      description: 'Select which video to use as the cover and configure its preview settings',
      type: 'object',
      fields: [
        {
          name: 'asset',
          title: 'Cover Video',
          type: 'mux.video',
          description: 'Select or upload the video to use as the cover/thumbnail for this project',
          validation: Rule => Rule.required().error('A cover video is required')
        },
        {
          name: 'thumbTime',
          title: 'Thumbnail Time (seconds)',
          description: 'Position in the video to use for the static thumbnail (in seconds)',
          type: 'number',
          initialValue: 0,
          validation: Rule => Rule.min(0)
        },
        {
          name: 'hoverPreview',
          title: 'Hover Preview Settings',
          description: 'Configure what segment of the video plays on hover',
          type: 'object',
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
              startTime: 'startTime',
              endTime: 'endTime'
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
      ],
      preview: {
        select: {
          playbackId: 'asset.playbackId',
          thumbTime: 'thumbTime'
        },
        prepare({playbackId, thumbTime}) {
          const timeStr = thumbTime !== undefined ? `?time=${thumbTime}` : '';
          return {
            title: 'Cover Video',
            media: playbackId 
              ? `https://image.mux.com/${playbackId}/thumbnail.jpg${timeStr}` 
              : undefined
          }
        }
      }
    }),
  ],
  preview: {
    select: {
      title: 'name',
      coverVideo: 'coverVideo'
    },
    prepare({ title, coverVideo }) {
      // Use the dedicated cover video field for the preview
      const playbackId = coverVideo?.asset?.playbackId;
      const thumbTime = coverVideo?.thumbTime !== undefined ? `?time=${coverVideo.thumbTime}` : '';
      
      return {
        title,
        media: playbackId 
          ? `https://image.mux.com/${playbackId}/thumbnail.jpg${thumbTime}` 
          : undefined
      };
    }
  }
})