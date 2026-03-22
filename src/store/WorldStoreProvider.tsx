import { type PropsWithChildren, useEffect, useState } from 'react'
import { createWorldStore } from './worldStore'
import { WorldStoreContext } from './worldStoreContext'

export type WorldStoreProviderProps = PropsWithChildren<{
  store?: ReturnType<typeof createWorldStore>
}>

export function WorldStoreProvider({ children, store }: WorldStoreProviderProps) {
  const [resolvedStore] = useState(() => store ?? createWorldStore())

  useEffect(() => {
    void resolvedStore.getState().hydrate()
  }, [resolvedStore])

  return (
    <WorldStoreContext.Provider value={resolvedStore}>
      {children}
    </WorldStoreContext.Provider>
  )
}
