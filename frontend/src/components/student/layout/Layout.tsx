import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../../student/layout/Sidebar';
import Topbar from '../../student/layout/Topbar';
import Footer from '../../student/layout/Footer';
import { useDarkMode } from '../../../hooks/useDarkMode';



export default function Layout() {
  const [isDark, toggleDark] = useDarkMode();
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden bg-surface dark:bg-surface-dark">
     <Sidebar
      isMobileOpen={isMobileSidebarOpen}
      onCloseMobile={() => setMobileSidebarOpen(false)}
  collapsed={collapsed}
onToggleCollapse={() => setCollapsed(!collapsed)}
    />

      <div className="flex h-screen flex-1 flex-col">
        <Topbar
          isDark={isDark}
          onToggleDark={toggleDark}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1400px] animate-fadeIn">
            <Outlet />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
