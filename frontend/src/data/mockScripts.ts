import type { Script } from '../types/script'

export const mockScripts: Script[] = [
  {
    id: 'script-001',
    name: 'Rotate Edge Certificates',
    description: 'Fetches fresh TLS certs and deploys them to the edge proxy tier.',
    language: 'bash',
    content: '#!/bin/bash\nset -euo pipefail\nacmectl fetch --env=prod\nsystemctl reload edge-proxy\n',
    createdAt: '2025-11-20T09:00:00.000Z',
    updatedAt: '2025-11-25T10:20:00.000Z',
    origin: 'wizard',
    folderId: 'folder-ops-sre',
    tags: ['edge', 'security'],
  },
  {
    id: 'script-002',
    name: 'Clean orphaned pods',
    description: 'Prunes zombie workloads across the us-west clusters.',
    language: 'python',
    content:
      "#!/usr/bin/env python3\nimport subprocess\nsubprocess.run(['kubectl', 'delete', 'pod', '--field-selector=status.phase==Failed'])\n",
    createdAt: '2025-11-05T13:45:00.000Z',
    updatedAt: '2025-11-27T08:05:00.000Z',
    origin: 'manual',
    folderId: 'folder-ops',
    tags: ['operations', 'cleanup'],
  },
  {
    id: 'script-003',
    name: 'Notify salesforce drift',
    description: 'Diffs CRM schemas and posts alerts when fields change.',
    language: 'node',
    content:
      "#!/usr/bin/env node\nimport { runDriftCheck } from './salesforce/drift-checker.js'\nrunDriftCheck()\n",
    createdAt: '2025-11-15T08:32:00.000Z',
    updatedAt: '2025-11-28T14:42:00.000Z',
    origin: 'import',
    folderId: 'folder-integrations',
    tags: ['crm', 'integrations'],
  },
]
