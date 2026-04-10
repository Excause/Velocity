import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import News from './pages/News.jsx'
import Stocks from './pages/Stocks.jsx'
import Recommendations from './pages/Recommendations.jsx'
import Simulator from './pages/Simulator.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="news" element={<News />} />
        <Route path="stocks" element={<Stocks />} />
        <Route path="stocks/:symbol" element={<Stocks />} />
        <Route path="recommendations" element={<Recommendations />} />
        <Route path="simulator" element={<Simulator />} />
      </Route>
    </Routes>
  )
}
