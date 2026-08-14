import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Briefcase, GraduationCap, Tent, Users, Settings } from 'lucide-react'; // <-- Ajout de Settings

// Imports de vos Layouts
import ScolariteLayout from './modules/scolarite/layout/ScolariteLayout';
import RhLayout from './modules/rh/layout/RhLayout';
import EnseignantLayout from './modules/enseignant/layout/EnseignantLayout';
import ClubLayout from './modules/clubs/layout/ClubLayout';
import ConfigLayout from './modules/configuration/layout/ConfigLayout'; // <-- Déjà là !

// ─────────────────────────────────────────────────────────────
// Page d'accueil : Sélecteur de Portail
// ─────────────────────────────────────────────────────────────
function PortalSelector() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
          SmartCampus ERP
        </h1>
        <p className="text-slate-500 mt-3 text-sm md:text-base">
          Veuillez sélectionner le portail auquel vous souhaitez accéder.
        </p>
      </div>

      {/* J'ai passé le grid en 'justify-center' pour que la 5ème carte soit bien centrée en bas */}
      <div className="flex flex-wrap justify-center gap-6 max-w-6xl w-full">
        
        {/* Module 5: Scolarité */}
        <Link
          to="/scolarite"
          className="group w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(25%-1.5rem)] bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex flex-col items-center text-center"
        >
          <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Scolarité</h2>
          <p className="text-sm text-slate-500">
            Gestion des étudiants, workflows et attestations.
          </p>
        </Link>

        {/* Module 6: RH */}
        <Link
          to="/rh"
          className="group w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(25%-1.5rem)] bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:border-emerald-200 transition-all duration-300 flex flex-col items-center text-center"
        >
          <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
            <Users className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Ressources Humaines</h2>
          <p className="text-sm text-slate-500">
            Gestion des employés, congés et feuilles de temps.
          </p>
        </Link>

        {/* Module 7: Enseignant */}
        <Link
          to="/enseignant"
          className="group w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(25%-1.5rem)] bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:border-indigo-200 transition-all duration-300 flex flex-col items-center text-center"
        >
          <div className="h-16 w-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
            <Briefcase className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Espace Enseignant</h2>
          <p className="text-sm text-slate-500">
            Consultations, absences et réclamations de notes.
          </p>
        </Link>

        {/* Module 8: Clubs & Smart Campus */}
        <Link
          to="/clubs"
          className="group w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(25%-1.5rem)] bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:border-violet-200 transition-all duration-300 flex flex-col items-center text-center"
        >
          <div className="h-16 w-16 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-violet-600 group-hover:text-white transition-all duration-300">
            <Tent className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Vie Étudiante & Clubs</h2>
          <p className="text-sm text-slate-500">
            Smart Campus, réservations et gestion des clubs.
          </p>
        </Link>

        {/* Module 10: Configuration (Le NOUVEAU !) */}
        <Link
          to="/config"
          className="group w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(25%-1.5rem)] bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:border-slate-300 transition-all duration-300 flex flex-col items-center text-center"
        >
          <div className="h-16 w-16 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-slate-800 group-hover:text-white transition-all duration-300">
            <Settings className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Configuration</h2>
          <p className="text-sm text-slate-500">
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
        
        {/* NOUVELLE ROUTE POUR LE MODULE 10 */}
        <Route path="/config/*" element={<ConfigLayout />} />

        {/* Route de secours (404) */}
        <Route 
          path="*" 
          element={
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
              <h1 className="text-4xl font-bold text-slate-800 mb-4">404</h1>
              <p className="text-slate-500 mb-6">Page introuvable.</p>
              <Link to="/" className="text-blue-600 hover:underline">Retour à l'accueil</Link>
            </div>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}