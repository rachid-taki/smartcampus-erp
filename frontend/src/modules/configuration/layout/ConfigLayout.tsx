import { useState } from 'react';
import { Settings, CalendarDays } from 'lucide-react';
import ParametresSysteme from '../pages/ParametresSysteme';
import CalendrierAcademique from '../pages/CalendrierAcademique';

type ConfigTab = 'parametres' | 'calendrier';

export default function ConfigLayout() {
  const [activeTab, setActiveTab] = useState<ConfigTab>('parametres');

  return (
    <div className="sc-portal min-h-screen flex flex-col">
      {/* Topbar de Navigation (Module Configuration) */}
      <header className="bg-card dark:bg-card-dark border-b border-slate-200/70 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            
            {/* Logo / Titre du module */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 shadow-lg shadow-primary-900/20">
                <Settings className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800 dark:text-white leading-tight tracking-tight">Configuration</h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Super Admin</p>
              </div>
            </div>

            {/* Onglets de navigation */}
            <nav className="flex gap-2">
              <button
                onClick={() => setActiveTab('parametres')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'parametres'
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Paramètres Système</span>
              </button>
              
              <button
                onClick={() => setActiveTab('calendrier')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'calendrier'
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">Calendrier Académique</span>
              </button>
            </nav>
            
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <div className="flex-1 overflow-auto animate-fade-in">
        {activeTab === 'parametres' ? <ParametresSysteme /> : <CalendrierAcademique />}
      </div>
    </div>
  );
}