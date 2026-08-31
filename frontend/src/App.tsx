import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './hooks/useAuth'
import { CategoriesProvider } from './hooks/useCategories'
import { MonthProvider } from './hooks/useMonth'
import { RefreshProvider } from './hooks/useRefresh'
import { ToastProvider } from './hooks/useToast'
import Budgets from './pages/Budgets'
import Categories from './pages/Categories'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import Reports from './pages/Reports'
import Transactions from './pages/Transactions'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Register />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <MonthProvider>
                    <RefreshProvider>
                      <CategoriesProvider>
                        <Routes>
                          <Route element={<Layout />}>
                            <Route index element={<Dashboard />} />
                            <Route path="transacciones" element={<Transactions />} />
                            <Route path="presupuestos" element={<Budgets />} />
                            <Route path="categorias" element={<Categories />} />
                            <Route path="reportes" element={<Reports />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                          </Route>
                        </Routes>
                      </CategoriesProvider>
                    </RefreshProvider>
                  </MonthProvider>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
