import { Outlet } from "react-router-dom";
import SuperAdminSidebar from "../SuperAdminSidebar";
import { useDarkMode } from "../../../hooks/useDarkMode";
import { useState } from "react";
import SuperAdminTopbar from "../SuperAdminTopbar";

export default function SuperAdminLayout() {
    const [isDark, toggleDark] = useDarkMode();
    const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
      
    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
            <SuperAdminSidebar />
            <div className="flex flex-1 flex-col">
                <SuperAdminTopbar />
                <main className="flex-1 overflow-y-auto p-5">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}