declare module 'synaptic' {
  export namespace Architect {
    class Perceptron {
      constructor(...layers: number[])
      activate(input: number[]): number[]
    }
  }

  export interface TrainingPattern {
    input: number[]
    output: number[]
  }

  export interface TrainingOptions {
    iterations?: number
    rate?: number
    error?: number
    shuffle?: boolean
  }

  export class Trainer {
    constructor(network: unknown)
    train(dataset: TrainingPattern[], options?: TrainingOptions): void
  }
}
