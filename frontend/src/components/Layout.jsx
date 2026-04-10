import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import Header from './Header.jsx'
import Sidebar from './Sidebar.jsx'
import SettingsModal from './SettingsModal.jsx'
import { useAppStore } from '../store/appStore.js'

export default function Layout() {
  const { sidebarOpen, settingsOpen } = useAppStore()

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 ${sidebarOpen ? 'ml-0' : 'ml-0'}`}>
        <Header />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-screen-2xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Settings Modal */}
      {settingsOpen && <SettingsModal />}
    </div>
  )
}
