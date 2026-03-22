import type { SimulationRequest, SimulationResponse } from './engine'
import { runSimulation } from './engine'

export type SimulationWorkerMessage =
  | { type: 'run'; jobId: string; payload: SimulationRequest }
  | { type: 'result'; jobId: string; payload: SimulationResponse }
  | { type: 'error'; jobId: string; message: string }

self.onmessage = (event: MessageEvent<SimulationWorkerMessage>) => {
  const message = event.data

  if (message.type !== 'run') {
    return
  }

  try {
    const payload = runSimulation(message.payload)
    self.postMessage({
      type: 'result',
      jobId: message.jobId,
      payload,
    } satisfies SimulationWorkerMessage)
  } catch (error) {
    self.postMessage({
      type: 'error',
      jobId: message.jobId,
      message: error instanceof Error ? error.message : 'Simulation worker failed.',
    } satisfies SimulationWorkerMessage)
  }
}
