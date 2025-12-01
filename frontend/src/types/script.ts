export type ScriptLanguage = 'bash' | 'python' | 'node'

export type ScriptOrigin = 'manual' | 'import' | 'wizard' | 'clone'

export interface Script {
  id: string
  name: string
  description: string
  language: ScriptLanguage
  content: string
  updatedAt: string
  origin: ScriptOrigin
  folderId: string | null
}

export interface ScriptInput {
  name: string
  description: string
  language: ScriptLanguage
  content: string
  origin?: ScriptOrigin
  folderId?: string | null
}

export type ScriptUpdate = Partial<Omit<Script, 'id'>>

export interface ScriptFolder {
  id: string
  name: string
  parentId: string | null
  updatedAt: string
}

export interface ScriptFolderInput {
  name: string
  parentId: string | null
}

export type ScriptFolderUpdate = Partial<Omit<ScriptFolder, 'id'>>

export const scriptLanguageCatalog: Record<ScriptLanguage, { label: string; defaultSnippet: string }> = {
  bash: {
    label: 'Bash',
    defaultSnippet: '#!/bin/bash\nset -euo pipefail\n',
  },
  python: {
    label: 'Python',
    defaultSnippet: "#!/usr/bin/env python3\nif __name__ == '__main__':\n    print('Ready to automate')\n",
  },
  node: {
    label: 'Node.js',
    defaultSnippet: "#!/usr/bin/env node\nconsole.log('Hello from Alfred');\n",
  },
}
