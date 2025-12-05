import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fakeActivate = vi.fn((inputs: number[]) => [
  Math.min(1, inputs[1] + 0.2),
  Math.min(1, inputs[0] + 0.1),
  Math.max(0, inputs[3] - 0.1),
])

vi.mock('synaptic', () => {
  class FakeNetwork {
    activate(inputs: number[]) {
      return fakeActivate(inputs)
    }
  }

  class FakeTrainer {
    train() {}
  }

  return {
    Architect: { Perceptron: FakeNetwork },
    Trainer: FakeTrainer,
  }
})

import { runAiReview } from '../ai/reviewer'

describe('runAiReview', () => {
  beforeEach(() => {
    fakeActivate.mockClear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns balanced insights for well documented scripts', async () => {
    const reviewPromise = runAiReview({
      name: 'Doc keeper',
      description: 'Keeps docs fresh',
      content: '#!/bin/bash\n# docs\necho "hello world"\n',
      language: 'bash',
    })

    await vi.runAllTimersAsync()
    const result = await reviewPromise

    expect(fakeActivate).toHaveBeenCalled()
    expect(result.scriptName).toBe('Doc keeper')
    expect(result.warnings).toEqual(['No critical risks detected. Keep following best practices.'])
    expect(result.metrics.commentDensity).toBeGreaterThan(0.15)
    expect(result.summary).toContain('Doc keeper')
    expect(result.metrics.maintainability).toBeGreaterThan(0)
  })

  it('flags destructive commands and missing documentation', async () => {
    const reviewPromise = runAiReview({
      name: 'Risk runner',
      description: '',
      content: 'rm -rf /tmp\nmkfs /dev/sda\n',
      language: 'bash',
    })

    await vi.runAllTimersAsync()
    const result = await reviewPromise

    expect(result.warnings).toContain('Potentially destructive or unsafe commands detected.')
    expect(result.warnings).toContain('Low documentation density can make maintenance harder.')
    expect(result.suggestions).toContain('Wrap destructive commands with safety prompts or dry-run guards.')
    expect(result.suggestions).toContain('Provide a concise description so teammates understand the script purpose.')
  })
})
