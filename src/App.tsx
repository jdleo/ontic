import { OnticApp } from './app/OnticApp'
import { WorldStoreProvider } from './store/WorldStoreProvider'

function App() {
  return (
    <WorldStoreProvider>
      <OnticApp />
    </WorldStoreProvider>
  )
}

export default App
