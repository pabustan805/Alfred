export type ScriptLanguage = 'bash' | 'python' | 'node' | 'ruby' | 'perl' | 'groovy'

export type ScriptOrigin = 'manual' | 'import' | 'wizard' | 'clone'

export interface Script {
  id: string
  name: string
  description: string
  language: ScriptLanguage
  content: string
  createdAt: string
  updatedAt: string
  origin: ScriptOrigin
  folderId: string | null
  tags: string[]
}

export interface ScriptInput {
  name: string
  description: string
  language: ScriptLanguage
  content: string
  origin?: ScriptOrigin
  folderId?: string | null
  createdAt?: string
  tags?: string[]
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
    defaultSnippet: "#!/usr/bin/env python3\nif __name__ == '__main__':\n    print('Ready to run')\n",
  },
  node: {
    label: 'Node.js',
    defaultSnippet: "#!/usr/bin/env node\nconsole.log('Hello from Alfred');\n",
  },
  ruby: {
    label: 'Ruby',
    defaultSnippet: "#!/usr/bin/env ruby\nputs 'Ready to run'\n",
  },
  perl: {
    label: 'Perl',
    defaultSnippet: "#!/usr/bin/env perl\nuse strict;\nuse warnings;\nprint \"Ready to run\\n\";\n",
  },
  groovy: {
    label: 'Groovy',
    defaultSnippet: "#!/usr/bin/env groovy\nprintln 'Ready to run'\n",
  },
}

export type ScriptExecutionStatus = 'running' | 'paused' | 'stopped' | 'completed'

export interface ScriptExecutionLogEntry {
  id: string
  message: string
  timestamp: string
  level: 'info' | 'warning' | 'error'
}

export interface ScriptExecution {
  id: string
  scriptId: string
  status: ScriptExecutionStatus
  startedAt: string
  updatedAt: string
  endedAt?: string
  durationMs: number
  logs: ScriptExecutionLogEntry[]
  savedAt?: string
}
