import { useState, useEffect } from 'react';

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
// Helper: map statut string -> Tailwind badge classes
// ─────────────────────────────────────────────────────────────

const getStatutBadgeClasses = (statut: string): string => {
  const map: Record<string, string> = {
    Brouillon: 'bg-gray-100 text-gray-700 border border-gray-200',
    Soumise: 'bg-blue-100 text-blue-700 border border-blue-200',
    En_Traitement: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    Validee: 'bg-green-100 text-green-700 border border-green-200',
    Rejetee: 'bg-red-100 text-red-700 border border-red-200',
    Cloturee: 'bg-slate-200 text-slate-700 border border-slate-300',
  };

  return map[statut] ?? 'bg-gray-100 text-gray-700 border border-gray-200';
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
      <div className="min-h-screen bg-gray-50 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-8 w-64 bg-gray-200 rounded-md animate-pulse mb-2" />
            <div className="h-4 w-96 bg-gray-200 rounded-md animate-pulse" />
          </div>

          {/* KPI skeleton cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse"
              >
                <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
                <div className="h-10 w-20 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-24 bg-gray-200 rounded" />
              </div>
            ))}
          </div>

          {/* Table skeleton */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="h-6 w-48 bg-gray-200 rounded mb-6 animate-pulse" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 w-full bg-gray-100 rounded animate-pulse" />
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-md border border-red-100 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-7 w-7 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            Erreur de chargement
          </h2>
          <p className="text-sm text-gray-500">{error}</p>
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
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Tableau de bord — Scolarité
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Vue d'ensemble des demandes, réclamations et certificats médicaux en attente de traitement.
          </p>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Card 1 — Demandes Administratives (Blue theme) */}
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-blue-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
                Demandes Administratives
              </h3>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
            <div className="flex items-end gap-6">
              <div>
                <p className="text-3xl font-bold text-gray-800">{demandesStats.soumises}</p>
                <p className="text-xs text-gray-500 mt-1">Nouvelles (soumises)</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-500">{demandesStats.enTraitement}</p>
                <p className="text-xs text-gray-500 mt-1">En traitement</p>
              </div>
            </div>
          </div>

          {/* Card 2 — Réclamations (Red/Orange theme) */}
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-red-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-red-600 uppercase tracking-wide">
                Réclamations
              </h3>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-800">{reclamationsStats.ouvertes}</p>
              <p className="text-xs text-gray-500 mt-1">Réclamations ouvertes</p>
            </div>
          </div>

          {/* Card 3 — Certificats Médicaux (Teal/Green theme) */}
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-teal-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-teal-600 uppercase tracking-wide">
                Certificats Médicaux
              </h3>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
                <svg className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-800">{certificatsStats.enAttente}</p>
              <p className="text-xs text-gray-500 mt-1">En attente de validation</p>
            </div>
          </div>
        </div>

        {/* Recent Activity Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Activité Récente</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Les 5 dernières demandes administratives soumises
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Numéro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Objet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date de Création
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentActivity.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-400">
                      Aucune activité récente à afficher.
                    </td>
                  </tr>
                ) : (
                  recentActivity.map((item) => (
                    <tr key={item.idDemande} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                        {item.numero}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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