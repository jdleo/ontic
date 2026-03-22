import { useContext } from 'react'
import { useStore } from 'zustand'
import { WorldStoreContext } from './worldStoreContext'
import type { WorldStore } from './worldStore'

export function useWorldStore<T>(selector: (state: WorldStore) => T): T {
  const store = useContext(WorldStoreContext)

  if (!store) {
    throw new Error('WorldStoreProvider is missing')
  }

  return useStore(store, selector)
}
