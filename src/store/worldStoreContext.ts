import { createContext } from 'react'
import type { createWorldStore } from './worldStore'

export const WorldStoreContext = createContext<ReturnType<typeof createWorldStore> | null>(null)
