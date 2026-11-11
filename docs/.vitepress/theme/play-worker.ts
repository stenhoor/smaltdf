// The playgrounds' engine worker: smaltdb's engine with smaltdf registered from this checkout's source, so views stored
// by an example read back as the examples test reads them. Started on a page's first Run (smaltdf.ts).
import { defineWorker } from 'smaltdb/worker-runtime'
import { dfLanguage } from '../../../src/index'

defineWorker({ languages: [dfLanguage] })
