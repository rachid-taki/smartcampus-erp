import { useState, useEffect } from 'react';
import { FileText, AlertCircle, FileCheck, AlertTriangle } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces (Strict typing for the API payload)
// ─────────────────────────────────────────────────────────────

interface DemandesStats {
  soumises: number;
  enTraitement: number;
}

interface ReclamationsStats {
  ouvertes: number;
}

interface CertificatsStats {
  enAttente: number;
}

interface RecentActivityItem {
  idDemande: string;
  numero: string;
  objet: string;
  statut: string;
  dateCreation: string; // ISO date string
}

interface DashboardData {
  demandesStats: DemandesStats;
  reclamationsStats: ReclamationsStats;
  certificatsStats: CertificatsStats;
  recentActivity: RecentActivityItem[];
}

interface DashboardApiResponse {
  success: boolean;
  data: DashboardData;
}

// ─────────────────────────────────────────────────────────────
// Helper: format ISO date string to French locale (DD/MM/YYYY)
// ─────────────────────────────────────────────────────────────

const formatDateFr = (isoDate: string): string => {
  try {
    return new Date(isoDate).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
};

// ─────────────────────────────────────────────────────────────
// Helper: map statut string -> Tailwind badge classes (with Dark Mode)
// ─────────────────────────────────────────────────────────────

const getStatutBadgeClasses = (statut: string): string => {
  const map: Record<string, string> = {
    Brouillon: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    Soumise: 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800',
    En_Traitement: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    Validee: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800',
    Rejetee: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800',
    Cloturee: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
  };

  return map[statut] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
};

// Convert enum-style statut (e.g. "En_Traitement") to readable label ("En Traitement")
const formatStatutLabel = (statut: string): string => statut.replace(/_/g, ' ');

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export default function ScolariteDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchStats = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          'http://localhost:3000/api/scolarite/dashboard/stats',
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`Erreur serveur (code ${response.status})`);
        }

        const json: DashboardApiResponse = await response.json();

        if (!json.success) {
          throw new Error('La requête a échoué côté serveur.');
        }

        setData(json.data);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // Component unmounted mid-fetch — ignore silently
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : 'Impossible de contacter le serveur. Vérifiez que le backend est démarré.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    return () => controller.abort();
  }, []);

  // ───────────────────────────────────────────────────────────
  // Loading State
  // ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="sc-portal min-h-screen p-6 md:p-8 animate-fade-in">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse mb-2" />
            <div className="h-4 w-96 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
          </div>

          {/* KPI skeleton cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="card p-6 animate-pulse"
              >
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded mb-4" />
                <div className="h-10 w-20 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
                <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            ))}
          </div>

          {/* Table skeleton */}
          <div className="card p-6">
            <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-6 animate-pulse" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────
  // Error State
  // ───────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="sc-portal min-h-screen flex items-center justify-center p-6 animate-fade-in">
        <div className="max-w-md w-full card p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-2 tracking-tight">
            Erreur de chargement
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────
  // Success State
  // ───────────────────────────────────────────────────────────

  if (!data) {
    return null; // Defensive fallback — should not occur given the states above
  }

  const { demandesStats, reclamationsStats, certificatsStats, recentActivity } = data;

  return (
    <div className="sc-portal min-h-screen p-6 md:p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
            Tableau de bord — Scolarité
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Vue d'ensemble des demandes, réclamations et certificats médicaux en attente de traitement.
          </p>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Card 1 — Demandes Administratives (Primary theme) */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wide">
                Demandes Administratives
              </h3>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/30">
                <FileText className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <div className="flex items-end gap-6">
              <div>
                <p className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{demandesStats.soumises}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Nouvelles (soumises)</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary-500 dark:text-primary-400 tabular-nums tracking-tight">{demandesStats.enTraitement}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">En traitement</p>
              </div>
            </div>
          </div>

          {/* Card 2 — Réclamations (Red/Semantic theme) */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">
                Réclamations
              </h3>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/30">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{reclamationsStats.ouvertes}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Réclamations ouvertes</p>
            </div>
          </div>

          {/* Card 3 — Certificats Médicaux (Emerald/Semantic theme) */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                Certificats Médicaux
              </h3>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                <FileCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{certificatsStats.enAttente}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">En attente de validation</p>
            </div>
          </div>
        </div>

        {/* Recent Activity Table */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200/70 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white tracking-tight">Activité Récente</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Les 5 dernières demandes administratives soumises
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200/70 dark:divide-slate-800">
              <thead className="bg-surface dark:bg-surface-dark/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Numéro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Objet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Date de Création
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {recentActivity.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      Aucune activité récente à afficher.
                    </td>
                  </tr>
                ) : (
                  recentActivity.map((item) => (
                    <tr key={item.idDemande} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-white tabular-nums">
                        {item.numero}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate">
                        {item.objet}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatutBadgeClasses(
                            item.statut
                          )}`}
                        >
                          {formatStatutLabel(item.statut)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                        {formatDateFr(item.dateCreation)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}