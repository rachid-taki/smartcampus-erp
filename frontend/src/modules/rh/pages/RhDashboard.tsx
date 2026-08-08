import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserCheck,
  Palmtree,
  Bell,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Calendar,
  FileText,
  Clock,
  Building2,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────

type TypeDemandeRh =
  | 'Conge_Normal'
  | 'Conge_Exceptionnel'
  | 'Conge_Maladie'
  | 'Attestation_Travail'
  | 'Attestation_Salaire'
  | 'Heure_Supplementaire';

type StatutDemandeRh = 'Soumise' | 'En_Traitement' | 'Validee' | 'Rejetee';

interface DemandesEnAttente {
  conges: number;
  attestations: number;
  heuresSup: number;
}

interface EmployeParDepartement {
  departement: string;
  _count: {
    departement: number;
  };
}

interface Utilisateur {
  nom: string;
  prenom: string;
}

interface EmployeRef {
  utilisateur: Utilisateur;
}

interface DemandeRecente {
  id_demande_rh: string;
  type: TypeDemandeRh;
  statut: StatutDemandeRh;
  date_demande: string;
  employe: EmployeRef;
}

interface DashboardStats {
  totalEmployes: number;
  employesActifs: number;
  employesEnConge: number;
  demandesEnAttente: DemandesEnAttente;
  employesParDepartement: EmployeParDepartement[];
  demandesRecentes: DemandeRecente[];
}

interface ApiResponse {
  success: boolean;
  data: DashboardStats;
}

const API_BASE = 'http://localhost:3000/api/rh';

// ─────────────────────────────────────────────────────────────
// Helpers
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

const formatTypeLabel = (type: TypeDemandeRh): string => {
  const map: Record<TypeDemandeRh, string> = {
    Conge_Normal: 'Congé Normal',
    Conge_Exceptionnel: 'Congé Exceptionnel',
    Conge_Maladie: 'Congé Maladie',
    Attestation_Travail: 'Attestation de Travail',
    Attestation_Salaire: 'Attestation de Salaire',
    Heure_Supplementaire: 'Heures Supplémentaires',
  };
  return map[type] ?? type.replace(/_/g, ' ');
};

const formatStatutLabel = (statut: StatutDemandeRh): string => {
  const map: Record<StatutDemandeRh, string> = {
    Soumise: 'Soumise',
    En_Traitement: 'En traitement',
    Validee: 'Validée',
    Rejetee: 'Rejetée',
  };
  return map[statut] ?? statut.replace(/_/g, ' ');
};

const getStatutBadgeClasses = (statut: StatutDemandeRh): string => {
  const map: Record<StatutDemandeRh, string> = {
    Soumise: 'bg-blue-100 text-blue-700 border border-blue-200',
    En_Traitement: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    Validee: 'bg-green-100 text-green-700 border border-green-200',
    Rejetee: 'bg-red-100 text-red-700 border border-red-200',
  };
  return map[statut] ?? 'bg-gray-100 text-gray-600 border border-gray-200';
};

const getTypeIcon = (type: TypeDemandeRh) => {
  if (type.startsWith('Conge')) return <Palmtree className="h-3.5 w-3.5 text-teal-500" />;
  if (type.startsWith('Attestation')) return <FileText className="h-3.5 w-3.5 text-indigo-500" />;
  return <Clock className="h-3.5 w-3.5 text-orange-500" />;
};

const DEPARTMENT_COLORS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-red-500',
  'bg-violet-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-lime-500',
];

// ─────────────────────────────────────────────────────────────
// KPI Card Component
// ─────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {label}
        </p>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Dashboard Component
// ─────────────────────────────────────────────────────────────

export default function RhDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/dashboard/stats`, { signal });

      if (!response.ok) {
        throw new Error(`Erreur serveur (code ${response.status})`);
      }

      const json: ApiResponse = await response.json();

      if (!json.success) {
        throw new Error('La requête a échoué côté serveur.');
      }

      setStats(json.data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message =
        err instanceof Error
          ? err.message
          : 'Impossible de contacter le serveur. Vérifiez que le backend est démarré.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchStats(controller.signal);
    return () => controller.abort();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
          <p className="text-sm text-gray-500">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-md border border-red-100 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-7 w-7 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            Erreur de chargement
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {error || 'Impossible de charger les statistiques du tableau de bord.'}
          </p>
          <button
            onClick={() => fetchStats()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const totalDemandesEnAttente =
    stats.demandesEnAttente.conges +
    stats.demandesEnAttente.attestations +
    stats.demandesEnAttente.heuresSup;

  const departmentData = (stats.employesParDepartement || []).map((entry) => ({
    name: entry?.departement || 'Non renseigné',
    value: entry?._count?.departement || 0,
  }));

  const totalDeptCount = departmentData.reduce((acc, curr) => acc + curr.value, 0) || 1;

  const pendingData = [
    { name: 'Congés', value: stats.demandesEnAttente.conges, color: 'bg-teal-500' },
    { name: 'Attestations', value: stats.demandesEnAttente.attestations, color: 'bg-indigo-500' },
    { name: 'Heures Sup.', value: stats.demandesEnAttente.heuresSup, color: 'bg-orange-500' },
  ];

  const maxPending = Math.max(...pendingData.map((d) => d.value), 1);

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Tableau de Bord RH
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Vue d'ensemble des effectifs et des demandes en cours de traitement.
          </p>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="Total Employés"
            value={stats.totalEmployes}
            icon={<Users className="h-5 w-5" />}
            iconBg="bg-indigo-100"
            iconColor="text-indigo-600"
          />
          <KpiCard
            label="Employés Actifs"
            value={stats.employesActifs}
            icon={<UserCheck className="h-5 w-5" />}
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
          />
          <KpiCard
            label="En Congé"
            value={stats.employesEnConge}
            icon={<Palmtree className="h-5 w-5" />}
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
          />
          <KpiCard
            label="Demandes en Attente"
            value={totalDemandesEnAttente}
            icon={<Bell className="h-5 w-5" />}
            iconBg="bg-rose-100"
            iconColor="text-rose-600"
          />
        </div>

        {/* Visual Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Department Breakdown Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-semibold text-gray-700">
                Répartition par Département
              </h2>
            </div>

            {departmentData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-gray-400">
                Aucune donnée disponible.
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                {departmentData.map((dept, index) => {
                  const percentage = Math.round((dept.value / totalDeptCount) * 100);
                  const colorClass = DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length];
                  return (
                    <div key={dept.name}>
                      <div className="flex justify-between text-xs font-medium text-gray-600 mb-1">
                        <span>{dept.name}</span>
                        <span>
                          {dept.value} employé{dept.value > 1 ? 's' : ''} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending Requests Breakdown Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-semibold text-gray-700">
                Demandes en Attente par Type
              </h2>
            </div>

            <div className="space-y-6 pt-4">
              {pendingData.map((item) => {
                const barWidth = Math.round((item.value / maxPending) * 100);
                return (
                  <div key={item.name}>
                    <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1.5">
                      <span>{item.name}</span>
                      <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {item.value} en attente
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Activity Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Demandes Récentes</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Les 5 dernières demandes soumises par les employés
            </p>
          </div>

          {stats.demandesRecentes.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400">
              Aucune demande récente à afficher.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Employé
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats.demandesRecentes.map((demande) => {
                    const { nom, prenom } = demande.employe.utilisateur;
                    return (
                      <tr key={demande.id_demande_rh} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold">
                              {prenom?.[0]}
                              {nom?.[0]}
                            </div>
                            <span className="text-sm font-medium text-gray-800">
                              {prenom} {nom}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                            {getTypeIcon(demande.type)}
                            {formatTypeLabel(demande.type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            {formatDateFr(demande.date_demandes ?? demande.date_demande)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatutBadgeClasses(
                              demande.statut
                            )}`}
                          >
                            {formatStatutLabel(demande.statut)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}