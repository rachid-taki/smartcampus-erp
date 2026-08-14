import { useState, useEffect } from 'react';
import { 
  Tent, 
  FileText, 
  MapPin, 
  Activity, 
  ShieldAlert, 
  Loader2, 
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────

interface DashboardStats {
  clubs: { total: number; actifs: number };
  demandes: { enAttente: number };
  reservations: { enAttente: number };
  sessions: { enCours: number };
  alertes: { aTraiter: number; critiques: number };
}

const API_URL = 'http://localhost:3000/api/clubs-dashboard/stats';

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export default function ClubsDashboard({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(API_URL);
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || 'Erreur lors de la récupération des statistiques');
        setStats(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de connexion au serveur');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    
    // Rafraîchissement automatique toutes les 30 secondes pour l'effet "Temps Réel"
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full p-8 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl flex flex-col items-center max-w-md text-center">
          <AlertTriangle className="h-10 w-10 mb-3 text-red-500" />
          <h2 className="text-lg font-bold mb-1">Impossible de charger le tableau de bord</h2>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <header className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 bg-gradient-to-br from-violet-900 to-indigo-900 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">Bienvenue sur le Smart Campus</h1>
            <p className="text-violet-200 max-w-xl text-sm leading-relaxed">
              Supervisez les activités des clubs étudiants, gérez les locaux en temps réel et gardez un œil sur les alertes de sécurité grâce à l'Intelligence Artificielle.
            </p>
          </div>
          {/* Décoration d'arrière-plan */}
          <div className="absolute -right-10 -top-24 opacity-10 pointer-events-none">
            <Activity className="w-96 h-96" />
          </div>
        </header>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          
          {/* Carte Clubs */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-fuchsia-50 text-fuchsia-600 rounded-lg">
                <Tent className="h-6 w-6" />
              </div>
              <span className="text-3xl font-bold text-gray-800">{stats?.clubs.total || 0}</span>
            </div>
            <h3 className="text-gray-500 font-medium text-sm mb-1">Clubs Étudiants</h3>
            <p className="text-sm font-semibold text-fuchsia-600 mb-4">{stats?.clubs.actifs || 0} actifs actuellement</p>
            <button 
              onClick={() => onNavigate?.('clubs')}
              className="text-xs font-semibold text-gray-400 group-hover:text-fuchsia-600 flex items-center gap-1 transition-colors"
            >
              Gérer les clubs <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Carte Demandes d'Événements */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <FileText className="h-6 w-6" />
              </div>
              <span className="text-3xl font-bold text-gray-800">{stats?.demandes.enAttente || 0}</span>
            </div>
            <h3 className="text-gray-500 font-medium text-sm mb-1">Demandes & Événements</h3>
            <p className="text-sm font-semibold text-blue-600 mb-4">En attente de validation</p>
            <button 
              onClick={() => onNavigate?.('evenements')}
              className="text-xs font-semibold text-gray-400 group-hover:text-blue-600 flex items-center gap-1 transition-colors"
            >
              Voir les requêtes <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Carte Réservations de Salles */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                <MapPin className="h-6 w-6" />
              </div>
              <span className="text-3xl font-bold text-gray-800">{stats?.reservations.enAttente || 0}</span>
            </div>
            <h3 className="text-gray-500 font-medium text-sm mb-1">Réservations de Salles</h3>
            <p className="text-sm font-semibold text-amber-600 mb-4">Demandes à traiter</p>
            <button 
              onClick={() => onNavigate?.('salles')}
              className="text-xs font-semibold text-gray-400 group-hover:text-amber-600 flex items-center gap-1 transition-colors"
            >
              Gérer les salles <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Carte Sessions Smart Campus */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-teal-50 text-teal-600 rounded-lg">
                <Activity className="h-6 w-6" />
              </div>
              <span className="text-3xl font-bold text-gray-800">{stats?.sessions.enCours || 0}</span>
            </div>
            <h3 className="text-gray-500 font-medium text-sm mb-1">Sessions de Cours</h3>
            <p className="text-sm font-semibold text-teal-600 mb-4 flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
              En cours actuellement
            </p>
            <button 
              onClick={() => onNavigate?.('sessions')}
              className="text-xs font-semibold text-gray-400 group-hover:text-teal-600 flex items-center gap-1 transition-colors"
            >
              Suivi temps réel <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Carte Alertes IA (Prend 2 colonnes sur grand écran) */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group md:col-span-2 xl:col-span-2 relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-red-50 to-transparent pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-gray-800">{stats?.alertes.aTraiter || 0}</span>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Alertes Totales</p>
                </div>
              </div>
              
              <h3 className="text-gray-500 font-medium text-sm mb-1">Surveillance IA & Conflits</h3>
              
              {stats && stats.alertes.critiques > 0 ? (
                <p className="text-sm font-bold text-red-600 mb-4 bg-red-50 inline-block px-2 py-1 rounded">
                  ⚠️ {stats.alertes.critiques} urgence(s) critique(s)
                </p>
              ) : (
                <p className="text-sm font-semibold text-green-600 mb-4">✅ Aucun incident critique</p>
              )}
              
              <button 
                onClick={() => onNavigate?.('alertes')}
                className="text-xs font-semibold text-gray-400 group-hover:text-red-600 flex items-center gap-1 transition-colors"
              >
                Ouvrir le centre de contrôle <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}