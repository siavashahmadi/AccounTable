import { ChakraProvider } from '@chakra-ui/react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'

// Import pages (to be created)
// import Home from './pages/Home'
// import Dashboard from './pages/Dashboard'
// import Login from './pages/Login'
// import Register from './pages/Register'
// import Partnerships from './pages/Partnerships'
// import Goals from './pages/Goals'

// Create Query Client
const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<div>Home Page (Coming Soon)</div>} />
              <Route path="/login" element={<div>Login Page (Coming Soon)</div>} />
              <Route path="/register" element={<div>Register Page (Coming Soon)</div>} />
              
              {/* Protected routes */}
              <Route path="/dashboard" element={<div>Dashboard (Coming Soon)</div>} />
              <Route path="/partnerships" element={<div>Partnerships (Coming Soon)</div>} />
              <Route path="/goals" element={<div>Goals (Coming Soon)</div>} />
            </Routes>
          </Router>
        </AuthProvider>
      </ChakraProvider>
    </QueryClientProvider>
  )
}

export default App 