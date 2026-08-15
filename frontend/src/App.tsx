import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Briefcase, GraduationCap, Tent, Users, Settings } from 'lucide-react';

// Imports de vos Layouts
import ScolariteLayout from './modules/scolarite/layout/ScolariteLayout';
import RhLayout from './modules/rh/layout/RhLayout';
import EnseignantLayout from './modules/enseignant/layout/EnseignantLayout';
import ClubLayout from './modules/clubs/layout/ClubLayout';
import ConfigLayout from './modules/configuration/layout/ConfigLayout';

// ─────────────────────────────────────────────────────────────
// Page d'accueil : Sélecteur de Portail
// ─────────────────────────────────────────────────────────────
function PortalSelector() {
  return (
    <div className="sc-portal min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight">
          SmartCampus ERP
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-3 text-sm md:text-base">
          Veuillez sélectionner le portail auquel vous souhaitez accéder.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-6 max-w-6xl w-full">
        
        {/* Module 5: Scolarité */}
        <Link
          to="/scolarite"
          className="group w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(25%-1.5rem)] card card-hover p-6 flex flex-col items-center text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mb-4 group-hover:scale-110 group-hover:bg-primary-600 group-hover:text-white transition-all duration-300">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Scolarité</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gestion des étudiants, workflows et attestations.
          </p>
        </Link>

        {/* Module 6: RH */}
        <Link
          to="/rh"
          className="group w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(25%-1.5rem)] card card-hover p-6 flex flex-col items-center text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mb-4 group-hover:scale-110 group-hover:bg-primary-600 group-hover:text-white transition-all duration-300">
            <Users className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Ressources Humaines</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gestion des employés, congés et feuilles de temps.
          </p>
        </Link>

        {/* Module 7: Enseignant */}
        <Link
          to="/enseignant"
          className="group w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(25%-1.5rem)] card card-hover p-6 flex flex-col items-center text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mb-4 group-hover:scale-110 group-hover:bg-primary-600 group-hover:text-white transition-all duration-300">
            <Briefcase className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Espace Enseignant</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Consultations, absences et réclamations de notes.
          </p>
        </Link>

        {/* Module 8: Clubs & Smart Campus */}
        <Link
          to="/clubs"
          className="group w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(25%-1.5rem)] card card-hover p-6 flex flex-col items-center text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mb-4 group-hover:scale-110 group-hover:bg-primary-600 group-hover:text-white transition-all duration-300">
            <Tent className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Vie Étudiante & Clubs</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Smart Campus, réservations et gestion des clubs.
          </p>
        </Link>

        {/* Module 10: Configuration */}
        <Link
          to="/config"
          className="group w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(25%-1.5rem)] card card-hover p-6 flex flex-col items-center text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mb-4 group-hover:scale-110 group-hover:bg-primary-600 group-hover:text-white transition-all duration-300">
            <Settings className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Configuration</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Paramètres globaux et calendrier académique.
          </p>
        </Link>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// App Component : Configuration du Routage
// ─────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route par défaut : La page de sélection */}
        <Route path="/" element={<PortalSelector />} />

        {/* Routes vers vos différents modules */}
        <Route path="/scolarite/*" element={<ScolariteLayout />} />
        <Route path="/rh/*" element={<RhLayout />} />
        <Route path="/enseignant/*" element={<EnseignantLayout />} />
        <Route path="/clubs/*" element={<ClubLayout />} />
        <Route path="/config/*" element={<ConfigLayout />} />

        {/* Route de secours (404) */}
        <Route 
          path="*" 
          element={
            <div className="sc-portal min-h-screen flex flex-col items-center justify-center animate-fade-in">
              <h1 className="text-4xl font-bold text-slate-800 dark:text-white mb-4 tabular-nums tracking-tight">404</h1>
              <p className="text-slate-500 dark:text-slate-400 mb-6">Page introuvable.</p>
              <Link 
                to="/" 
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium hover:underline transition-colors"
              >
                Retour à l'accueil
              </Link>
            </div>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}