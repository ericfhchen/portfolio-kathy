import { imageProjects } from './imageProject'
import { videoProjects } from './videoProject'
import { clientType } from './clients'
import { siteInfo } from './siteInfo'

export const schema = {
  types: [imageProjects, videoProjects, clientType, siteInfo],
}
