import type { Script } from '../types/script'

export const mockScripts: Script[] = [
  {
    id: 'script-001',
    name: 'Rotate Edge Certificates',
    description: 'Fetches fresh TLS certs and deploys them to the edge proxy tier.',
    language: 'bash',
    content: '#!/bin/bash\nset -euo pipefail\nacmectl fetch --env=prod\nsystemctl reload edge-proxy\n',
    updatedAt: '2025-11-25T10:20:00.000Z',
    origin: 'wizard',
  },
  {
    id: 'script-002',
    name: 'Clean orphaned pods',
    description: 'Prunes zombie workloads across the us-west clusters.',
    language: 'python',
    content:
      "#!/usr/bin/env python3\nimport subprocess\nsubprocess.run(['kubectl', 'delete', 'pod', '--field-selector=status.phase==Failed'])\n",
    updatedAt: '2025-11-27T08:05:00.000Z',
    origin: 'manual',
  },
  {
    id: 'script-003',
    name: 'Notify salesforce drift',
    description: 'Diffs CRM schemas and posts alerts when fields change.',
    language: 'node',
    content:
      "#!/usr/bin/env node\nimport { runDriftCheck } from './salesforce/drift-checker.js'\nrunDriftCheck()\n",
    updatedAt: '2025-11-28T14:42:00.000Z',
    origin: 'import',
  },
]
