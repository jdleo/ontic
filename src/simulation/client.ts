import type { SimulationRequest, SimulationResponse } from './engine'
import type { SimulationWorkerMessage } from './worker'

export class SimulationWorkerClient {
  private worker?: Worker

  constructor(worker?: Worker) {
    this.worker = worker
  }

  run(request: SimulationRequest): Promise<SimulationResponse> {
    const worker = this.resolveWorker()
    const jobId = crypto.randomUUID()

    return new Promise((resolve, reject) => {
      const onMessage = (event: MessageEvent<SimulationWorkerMessage>) => {
        if (event.data.jobId !== jobId) {
          return
        }

        worker.removeEventListener('message', onMessage)

        if (event.data.type === 'result') {
          resolve(event.data.payload)
          return
        }

        if (event.data.type === 'error') {
          reject(new Error(event.data.message))
          return
        }

        reject(new Error('Simulation worker returned an unexpected message.'))
      }

      worker.addEventListener('message', onMessage)
      worker.postMessage({
        type: 'run',
        jobId,
        payload: request,
      } satisfies SimulationWorkerMessage)
    })
  }

  private resolveWorker() {
    if (!this.worker) {
      this.worker = new Worker(new URL('./worker.ts', import.meta.url), {
        type: 'module',
      })
    }

    return this.worker
  }
}

export const simulationWorkerClient = new SimulationWorkerClient()
