import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './lib/auth/AuthProvider'
import { router } from './routes/router'

/** Root application component — provides auth state and mounts the router. */
function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default App
