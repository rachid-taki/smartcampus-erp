import {
    LayoutDashboard,
    FileText,
    FolderOpen,
    Clock3,
    History,
    User,
    Settings,
    LogOut
} from "lucide-react";

import { NavLink } from "react-router-dom";

const menus = [
    {
        name: "Tableau de bord",
        icon: LayoutDashboard,
        path: "/student"
    },
    {
        name: "Mes demandes",
        icon: FileText,
        path: "/student/requests"
    },
    {
        name: "Documents",
        icon: FolderOpen,
        path: "/student/documents"
    },
    {
        name: "Suivi",
        icon: Clock3,
        path: "/student/tracking"
    },
    {
        name: "Historique",
        icon: History,
        path: "/student/history"
    },
    {
        name: "Mon profil",
        icon: User,
        path: "/student/profile"
    }
];

export default function Sidebar() {

    return (

        <aside className="fixed left-0 top-0 h-screen w-72 bg-white shadow-lg border-r">

            <div className="h-20 flex items-center justify-center border-b">

                <h1 className="text-2xl font-bold text-blue-600">
                    SmartCampus
                </h1>

            </div>

            <nav className="p-5 space-y-2">

                {
                    menus.map((item) => {

                        const Icon = item.icon;

                        return (

                            <NavLink
                                key={item.name}
                                to={item.path}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 rounded-xl p-3 transition ${
                                        isActive
                                            ? "bg-blue-600 text-white"
                                            : "hover:bg-slate-100 text-slate-700"
                                    }`
                                }
                            >

                                <Icon size={20} />

                                <span>{item.name}</span>

                            </NavLink>

                        );

                    })
                }

            </nav>

            <div className="absolute bottom-0 left-0 w-full p-5 border-t">

                <button className="flex w-full items-center gap-3 rounded-xl p-3 hover:bg-red-50 text-red-600">

                    <Settings size={20} />

                    Paramètres

                </button>

                <button className="flex w-full items-center gap-3 rounded-xl p-3 hover:bg-red-50 text-red-600">

                    <LogOut size={20} />

                    Déconnexion

                </button>

            </div>

        </aside>

    );

}