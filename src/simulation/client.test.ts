import { describe, expect, it, vi } from 'vitest'
import { SimulationWorkerClient } from './client'
import type { SimulationWorkerMessage } from './worker'

describe('SimulationWorkerClient', () => {
  it('resolves worker results by job id', async () => {
    const listeners = new Set<(event: MessageEvent<SimulationWorkerMessage>) => void>()
    const worker = {
      addEventListener: vi.fn((_: string, listener: (event: MessageEvent<SimulationWorkerMessage>) => void) => {
        listeners.add(listener)
      }),
      removeEventListener: vi.fn((_: string, listener: (event: MessageEvent<SimulationWorkerMessage>) => void) => {
        listeners.delete(listener)
      }),
      postMessage: vi.fn((message) => {
        for (const listener of listeners) {
          listener({
            data: {
              type: 'result',
              jobId: message.jobId,
              payload: {
                rolloutCount: 300,
                result: {
                  outcomes: [{ label: 'Outcome', probability: 1 }],
                  keyDrivers: [],
                  modelConfidence: 0.7,
                },
              },
            },
          } as MessageEvent)
        }
      }),
    } as unknown as Worker

    const client = new SimulationWorkerClient(worker)
    const result = await client.run({
      ontology: {
        nodes: [],
        edges: [],
        variables: [],
        actors: [],
        events: [],
        assumptions: [],
      },
      query: {
        question: 'What happens?',
        targetOutcomes: ['Outcome'],
      },
    })

    expect(result.rolloutCount).toBe(300)
    expect(worker.postMessage).toHaveBeenCalled()
  })
})
