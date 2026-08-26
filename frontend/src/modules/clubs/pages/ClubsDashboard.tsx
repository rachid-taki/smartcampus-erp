import { useState, useEffect } from 'react';
import { 
  Tent, 
  FileText, 
  MapPin, 
  Activity, 
  ShieldAlert, 
  Loader2, 
  AlertTriangle,
  ArrowRight,
  CheckCircle
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
    
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className="sc-portal min-h-full flex items-center justify-center animate-fade-in">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30">
          <Loader2 className="h-7 w-7 animate-spin text-primary-600 dark:text-primary-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sc-portal min-h-full p-8 flex items-center justify-center animate-fade-in">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-6 rounded-xl flex flex-col items-center max-w-md text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 mb-3">
            <AlertTriangle className="h-7 w-7 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-lg font-bold mb-1 tracking-tight">Impossible de charger le tableau de bord</h2>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sc-portal min-h-screen p-6 md:p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <header className="card p-8 bg-primary-600 dark:bg-primary-700 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2 tracking-tight">Bienvenue sur le Smart Campus</h1>
            <p className="text-primary-100 max-w-xl text-sm leading-relaxed">
              Supervisez les activités des clubs étudiants, gérez les locaux en temps réel et gardez un œil sur les alertes de sécurité grâce à l'Intelligence Artificielle.
            </p>
          </div>
          <div className="absolute -right-10 -top-24 opacity-10 pointer-events-none">
            <Activity className="w-96 h-96" />
          </div>
        </header>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          
          {/* Carte Clubs */}
          <div className="card p-6 group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/30">
                <Tent className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
              <span className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{stats?.clubs.total || 0}</span>
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 font-medium text-sm mb-1">Clubs Étudiants</h3>
            <p className="text-sm font-semibold text-primary-600 dark:text-primary-400 mb-4 tabular-nums">{stats?.clubs.actifs || 0} actifs actuellement</p>
            <button 
              onClick={() => onNavigate?.('clubs')}
              className="text-xs font-semibold text-slate-400 dark:text-slate-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 flex items-center gap-1 transition-colors"
            >
              Gérer les clubs <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Carte Demandes d'Événements */}
          <div className="card p-6 group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{stats?.demandes.enAttente || 0}</span>
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 font-medium text-sm mb-1">Demandes & Événements</h3>
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-4">En attente de validation</p>
            <button 
              onClick={() => onNavigate?.('evenements')}
              className="text-xs font-semibold text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-1 transition-colors"
            >
              Voir les requêtes <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Carte Réservations de Salles */}
          <div className="card p-6 group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
                <MapPin className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{stats?.reservations.enAttente || 0}</span>
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 font-medium text-sm mb-1">Réservations de Salles</h3>
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-4">Demandes à traiter</p>
            <button 
              onClick={() => onNavigate?.('salles')}
              className="text-xs font-semibold text-slate-400 dark:text-slate-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 flex items-center gap-1 transition-colors"
            >
              Gérer les salles <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Carte Sessions Smart Campus */}
          <div className="card p-6 group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                <Activity className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{stats?.sessions.enCours || 0}</span>
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 font-medium text-sm mb-1">Sessions de Cours</h3>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-4 flex items-center gap-1.5 tabular-nums">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              En cours actuellement
            </p>
            <button 
              onClick={() => onNavigate?.('sessions')}
              className="text-xs font-semibold text-slate-400 dark:text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 flex items-center gap-1 transition-colors"
            >
              Suivi temps réel <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Carte Alertes IA */}
          <div className="card p-6 group md:col-span-2 xl:col-span-2 relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-red-50/50 dark:from-red-900/10 to-transparent pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/30">
                  <ShieldAlert className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{stats?.alertes.aTraiter || 0}</span>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wide">Alertes Totales</p>
                </div>
              </div>
              
              <h3 className="text-slate-500 dark:text-slate-400 font-medium text-sm mb-1">Surveillance IA & Conflits</h3>
              
              {stats && stats.alertes.critiques > 0 ? (
                <p className="text-sm font-bold text-red-700 dark:text-red-400 mb-4 bg-red-50 dark:bg-red-900/30 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-red-200 dark:border-red-800">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {stats.alertes.critiques} urgence(s) critique(s)
                </p>
              ) : (
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-4 flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4" />
                  Aucun incident critique
                </p>
              )}
              
              <button 
                onClick={() => onNavigate?.('alertes')}
                className="text-xs font-semibold text-slate-400 dark:text-slate-500 group-hover:text-red-600 dark:group-hover:text-red-400 flex items-center gap-1 transition-colors"
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