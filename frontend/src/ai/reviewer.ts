import { Architect, Trainer } from 'synaptic'
import type { ScriptLanguage } from '../types/script'

export interface ReviewTarget {
  name: string
  description: string
  content: string
  language: ScriptLanguage
}

export interface AIReviewResult {
  scriptName: string
  language: ScriptLanguage
  summary: string
  score: number
  metrics: {
    maintainability: number
    efficiency: number
    safety: number
    lengthScore: number
    commentDensity: number
    dangerousCommandRatio: number
  }
  warnings: string[]
  suggestions: string[]
  timestamp: string
}

const DANGEROUS_PATTERNS = [
  'rm -rf',
  'mkfs',
  'shutdown',
  'reboot',
  'dd if=',
  '>:(',
  'drop table',
  'delete from',
  'curl http:',
  'wget http:',
  ':(){:|:&};:',
]

const COMMENT_PREFIXES = ['#', '//', '--']

const aiNetwork = (() => {
  const network = new Architect.Perceptron(4, 6, 3)
  const trainer = new Trainer(network)
  const trainingDataset = [
    { input: [0.1, 0.8, 1, 1], output: [0.9, 0.85, 0.95] },
    { input: [0.3, 0.2, 0, 0.4], output: [0.45, 0.4, 0.35] },
    { input: [0.6, 0.1, 0, 0.3], output: [0.35, 0.3, 0.25] },
    { input: [0.5, 0.4, 1, 0.6], output: [0.6, 0.55, 0.65] },
    { input: [0.2, 0.6, 1, 0.8], output: [0.75, 0.7, 0.85] },
    { input: [0.8, 0.05, 0, 0.2], output: [0.25, 0.2, 0.2] },
  ]
  trainer.train(trainingDataset, { iterations: 250, error: 0.003, rate: 0.2, shuffle: true })
  return network
})()

export async function runAiReview(target: ReviewTarget): Promise<AIReviewResult> {
  const features = extractFeatures(target)
  const outputs = aiNetwork.activate(features.inputs)
  const maintainability = clamp(outputs[0])
  const efficiency = clamp(outputs[1])
  const safety = clamp(outputs[2])
  const score = Number(((maintainability + efficiency + safety) / 3).toFixed(2))

  const warnings: string[] = []
  if (safety < 0.45) {
    warnings.push('Potentially destructive or unsafe commands detected.')
  }
  if (features.diagnostics.commentDensity < 0.15) {
    warnings.push('Low documentation density can make maintenance harder.')
  }

  const suggestions = buildSuggestions(target, {
    maintainability,
    efficiency,
    safety,
    ...features.diagnostics,
  })

  if (!warnings.length) {
    warnings.push('No critical risks detected. Keep following best practices.')
  }

  if (!suggestions.length) {
    suggestions.push('Script looks solid. Consider adding regression tests for future changes.')
  }

  const summary = buildSummary(target, score)
  const result: AIReviewResult = {
    scriptName: target.name,
    language: target.language,
    summary,
    score,
    metrics: {
      maintainability,
      efficiency,
      safety,
      lengthScore: features.diagnostics.lengthScore,
      commentDensity: features.diagnostics.commentDensity,
      dangerousCommandRatio: features.diagnostics.dangerousCommandRatio,
    },
    warnings,
    suggestions,
    timestamp: new Date().toISOString(),
  }

  logAiReviewResult(result)
  await delay(220)
  return result
}

function extractFeatures(target: ReviewTarget) {
  const trimmedContent = target.content.trim()
  const lines = target.content.split(/\r?\n/)
  const totalLines = Math.max(lines.length, 1)
  const commentLines = lines.filter((line) => {
    const normalized = line.trim()
    return normalized.length > 0 && COMMENT_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  }).length

  const normalizedLength = Math.min(1, target.content.length / 1000)
  const lengthScore = clamp(1 - Math.max(0, target.content.length - 600) / 1200)
  const commentDensity = clamp(commentLines / totalLines)
  const hasShebang = trimmedContent.startsWith('#!') ? 1 : 0
  const dangerousMatches = DANGEROUS_PATTERNS.reduce((count, pattern) => {
    return count + (target.content.toLowerCase().includes(pattern) ? 1 : 0)
  }, 0)
  const dangerousCommandRatio = clamp(dangerousMatches / 3)

  const inputs = [normalizedLength, commentDensity, hasShebang, 1 - dangerousCommandRatio]

  return {
    inputs,
    diagnostics: {
      lengthScore,
      commentDensity,
      dangerousCommandRatio,
    },
  }
}

function buildSuggestions(
  target: ReviewTarget,
  metrics: {
    maintainability: number
    efficiency: number
    safety: number
    lengthScore: number
    commentDensity: number
    dangerousCommandRatio: number
  },
) {
  const suggestions: string[] = []

  if (metrics.commentDensity < 0.2) {
    suggestions.push('Add inline comments to explain complex steps or parameter choices.')
  }

  if (metrics.lengthScore < 0.4) {
    suggestions.push('Consider modularizing or extracting shell functions to keep scripts readable.')
  }

  if (!target.description.trim()) {
    suggestions.push('Provide a concise description so teammates understand the script purpose.')
  }

  if (metrics.dangerousCommandRatio > 0.25) {
    suggestions.push('Wrap destructive commands with safety prompts or dry-run guards.')
  }

  if (metrics.efficiency < 0.4) {
    suggestions.push('Review loops and external calls to ensure commands run only when necessary.')
  }

  return suggestions
}

function buildSummary(target: ReviewTarget, score: number) {
  let qualityLabel = 'balanced'
  if (score >= 0.8) {
    qualityLabel = 'excellent'
  } else if (score >= 0.6) {
    qualityLabel = 'solid'
  } else if (score < 0.4) {
    qualityLabel = 'risky'
  }

  return `AI review: ${target.name || 'Untitled script'} looks ${qualityLabel} (${Math.round(score * 100)}% confidence).`
}

function logAiReviewResult(result: AIReviewResult) {
  if (typeof console === 'undefined') {
    return
  }
  const label = `[AI Review] ${result.scriptName}`
  if (typeof console.groupCollapsed === 'function') {
    console.groupCollapsed(label)
  }
  console.info('Summary:', result.summary)
  console.table(result.metrics)
  console.info('Warnings:', result.warnings)
  console.info('Suggestions:', result.suggestions)
  if (typeof console.groupEnd === 'function') {
    console.groupEnd()
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const clamp = (value: number) => {
  if (Number.isNaN(value)) {
    return 0
  }
  if (value < 0) {
    return 0
  }
  if (value > 1) {
    return 1
  }
  return Number(value.toFixed(4))
}
