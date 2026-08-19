import type { CancerId, CancerProfile } from '../types'
import { breast } from './breast'
import { prostate } from './prostate'
import { lung } from './lung'
import { stomach } from './stomach'
import { colorectal } from './colorectal'
import { liver } from './liver'
import { pancreas } from './pancreas'
import { esophagus } from './esophagus'
import { headneck } from './headneck'
import { gyn } from './gyn'

export const CANCERS: CancerProfile[] = [
  breast, stomach, colorectal, lung, liver,
  prostate, pancreas, esophagus, headneck, gyn
]

export const CANCER_BY_ID = Object.fromEntries(
  CANCERS.map((c) => [c.id, c])
) as Record<CancerId, CancerProfile>
