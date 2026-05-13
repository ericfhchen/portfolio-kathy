import { cache } from 'react'
import { groq } from 'next-sanity'
import { sanityFetch as liveFetch } from './live'

export const sanityFetch = async (query, params = {}) => {
  const { data } = await liveFetch({ query, params })
  return data
}

const projectQuery = groq`*[
  (_type == "imageProjects" || _type == "videoProjects") &&
  slug.current == $slug
][0]{
  _type, _id, name, "slug": slug.current, orderRank, credits, projectTagline,
  client->{ title, link },
  "images": images[].asset->url,
  "videoGallery": videoGallery[]{
    _key,
    "asset": {
      "playbackId": asset.asset->playbackId,
      "_id": asset.asset->_id,
      "data": asset.asset->data
    },
    caption
  },
  "coverVideo": {
    "playbackId": coverVideo.asset.asset->playbackId,
    "_id": coverVideo.asset.asset->_id,
    "data": coverVideo.asset.asset->data,
    "thumbTime": coverVideo.thumbTime
  },
  "nextProject": *[_type == ^._type && orderRank > ^.orderRank] | order(orderRank)[0]{
    _id, name, "slug": slug.current, client->{ title }
  },
  "firstProject": *[_type == ^._type] | order(orderRank)[0]{
    _id, name, "slug": slug.current, client->{ title }
  }
}`

export const getProject = cache((slug) => sanityFetch(projectQuery, { slug }))
