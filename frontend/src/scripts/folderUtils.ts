import type { Script, ScriptFolder } from '../types/script'

export interface FolderTreeNode {
  folder: ScriptFolder | null
  children: FolderTreeNode[]
  scripts: Script[]
  totalScripts: number
}

export interface FolderOption {
  id: string
  label: string
}

export const UNGROUPED_FOLDER_KEY = '__ungrouped__'

const scriptMatchesQuery = (script: Script, query: string) => {
  if (!query) {
    return true
  }
  const haystack = [script.name, script.description, script.language, script.origin]
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

export const buildFolderTree = (folders: ScriptFolder[], scripts: Script[], query: string): FolderTreeNode[] => {
  const normalizedQuery = query.trim().toLowerCase()
  const sortedFolders = [...folders].sort((a, b) => a.name.localeCompare(b.name))
  const nodes = new Map<string, FolderTreeNode>()

  sortedFolders.forEach((folder) => {
    nodes.set(folder.id, {
      folder,
      children: [],
      scripts: [],
      totalScripts: 0,
    })
  })

  const ungroupedNode: FolderTreeNode = {
    folder: null,
    children: [],
    scripts: [],
    totalScripts: 0,
  }

  nodes.set(UNGROUPED_FOLDER_KEY, ungroupedNode)

  const roots: FolderTreeNode[] = []

  sortedFolders.forEach((folder) => {
    const node = nodes.get(folder.id)!
    if (folder.parentId && nodes.has(folder.parentId)) {
      nodes.get(folder.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  roots.push(ungroupedNode)

  const sortedScripts = [...scripts].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  sortedScripts.forEach((script) => {
    if (!scriptMatchesQuery(script, normalizedQuery)) {
      return
    }
    const targetKey = script.folderId && nodes.has(script.folderId) ? script.folderId : UNGROUPED_FOLDER_KEY
    nodes.get(targetKey)!.scripts.push(script)
  })

  const computeTotals = (node: FolderTreeNode): number => {
    node.children.sort((a, b) => {
      const nameA = a.folder?.name ?? ''
      const nameB = b.folder?.name ?? ''
      return nameA.localeCompare(nameB)
    })
    let total = node.scripts.length
    node.children.forEach((child) => {
      total += computeTotals(child)
    })
    node.totalScripts = total
    return total
  }

  roots.forEach((node) => {
    computeTotals(node)
  })

  return roots
}

export const buildFolderOptions = (folders: ScriptFolder[]): FolderOption[] => {
  const grouped = new Map<string | null, ScriptFolder[]>()
  folders.forEach((folder) => {
    const key = folder.parentId ?? null
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(folder)
  })

  grouped.forEach((entries) => entries.sort((a, b) => a.name.localeCompare(b.name)))

  const result: FolderOption[] = []
  const walk = (parentId: string | null, depth: number) => {
    const children = grouped.get(parentId)
    if (!children) {
      return
    }
    children.forEach((folder) => {
      const prefix = depth ? `${'— '.repeat(depth)}` : ''
      result.push({ id: folder.id, label: `${prefix}${folder.name}`.trim() })
      walk(folder.id, depth + 1)
    })
  }

  walk(null, 0)
  return result
}
