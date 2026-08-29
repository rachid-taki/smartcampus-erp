import { useState, useEffect, useCallback } from 'react';
import {
  Tent,
  Loader2,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Wallet,
  PartyPopper,
  Medal,
  Users,
  Building2,
  BarChart3,
  Activity,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface DashboardStats {
  clubs: { total: number; actifs: number };
  presidents: { actifs: number };
  demandes: { enAttente: number };
  evenements: { approuves: number };
  budget: { total: number };
}

type DashboardProps = {
  onNavigate?: (tab: 'dashboard' | 'clubs' | 'presidents' | 'evenements' | 'reservations') => void;
};

const API_URL = 'http://localhost:3000/api/clubs-dashboard/stats';

// ─────────────────────────────────────────────────────────────
// Animations
// ─────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 280, damping: 25 },
  },
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = () =>
  new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

const clampPercentage = (value: number) => Math.min(100, Math.max(0, value));

// ─────────────────────────────────────────────────────────────
// Shared Components
// ─────────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  iconClass = 'text-slate-400',
  title,
  description,
  right,
}: {
  icon: React.ElementType;
  iconClass?: string;
  title: string;
  description: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${iconClass}`} />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h2>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  iconClass: string;
  iconBg: string;
  progress?: number;
  progressLabel?: string;
  onClick?: () => void;
  actionLabel?: string;
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconClass,
  iconBg,
  progress,
  progressLabel,
  onClick,
  actionLabel,
}: StatCardProps) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-slate-100/70 blur-2xl dark:bg-slate-800/40" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg} transition-transform duration-300 group-hover:scale-110`}
          >
            <Icon className={`h-5 w-5 ${iconClass}`} />
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {value}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {title}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
            {description}
          </p>
        </div>

        {progress !== undefined && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold text-slate-400">
              <span>{progressLabel}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full rounded-full bg-fuchsia-500"
              />
            </div>
          </div>
        )}

        {onClick && actionLabel && (
          <button
            onClick={onClick}
            className="mt-5 flex items-center gap-1.5 text-xs font-bold text-slate-400 transition-colors hover:text-fuchsia-600 dark:text-slate-500 dark:hover:text-fuchsia-400"
          >
            {actionLabel}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Overview Card
// ─────────────────────────────────────────────────────────────

interface OverviewCardProps {
  count: number;
  label: string;
  icon: React.ElementType;
  iconBgClass: string;
  iconColorClass: string;
  hoverBorderClass: string;
  hoverBgClass: string;
  arrowHoverClass: string;
  onClick: () => void;
}

function OverviewCard({
  count,
  label,
  icon: Icon,
  iconBgClass,
  iconColorClass,
  hoverBorderClass,
  hoverBgClass,
  arrowHoverClass,
  onClick,
}: OverviewCardProps) {
  return (
    <button
      onClick={onClick}
      className={`group rounded-xl border border-slate-100 bg-slate-50 p-4 text-left transition dark:border-slate-800 dark:bg-slate-800/40 ${hoverBorderClass} ${hoverBgClass}`}
    >
      <div className="flex items-center justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBgClass} ${iconColorClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <ChevronRight className={`h-4 w-4 text-slate-300 transition group-hover:translate-x-1 ${arrowHoverClass}`} />
      </div>
      <p className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">{count}</p>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Status Card
// ─────────────────────────────────────────────────────────────

interface StatusCardProps {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconBgClass: string;
  iconColorClass: string;
  hoverBorderClass: string;
  hoverBgClass: string;
  arrowHoverClass: string;
  onClick: () => void;
}

function StatusCard({
  title,
  subtitle,
  icon: Icon,
  iconBgClass,
  iconColorClass,
  hoverBorderClass,
  hoverBgClass,
  arrowHoverClass,
  onClick,
}: StatusCardProps) {
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 text-left transition dark:border-slate-800 dark:bg-slate-800/40 ${hoverBorderClass} ${hoverBgClass}`}
    >
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${iconBgClass} ${iconColorClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-800 dark:text-white">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      <ArrowRight className={`h-4 w-4 flex-shrink-0 text-slate-300 transition group-hover:translate-x-1 ${arrowHoverClass}`} />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────

export default function ClubsDashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingReservationsCount, setPendingReservationsCount] = useState(0);

  const fetchPendingReservations = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3000/api/reservations');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPendingReservationsCount(
          json.data.filter((r: any) => r.statut === 'Demandee').length
        );
      }
    } catch {
      // silent fail — keeps last known count
    }
  }, []);

  const fetchStats = useCallback(async (silent = false) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const response = await fetch(API_URL);
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message || 'Erreur lors de la récupération des statistiques.');
      }
      if (!json.success || !json.data) {
        throw new Error('Réponse invalide du serveur.');
      }

      setStats(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchPendingReservations();

    const interval = setInterval(() => {
      fetchStats(true);
      fetchPendingReservations();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchStats, fetchPendingReservations]);

  // ───────────────────────────────────────────────────────────
  // Loading
  // ───────────────────────────────────────────────────────────

  if (loading && !stats) {
    return (
      <div className="flex min-h-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-fuchsia-100 dark:border-fuchsia-900/30" />
            <Loader2 className="h-7 w-7 animate-spin text-fuchsia-600 dark:text-fuchsia-400" />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Chargement du tableau de bord...
          </p>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────
  // Error
  // ───────────────────────────────────────────────────────────

  if (error && !stats) {
    return (
      <div className="flex min-h-full items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-red-200 bg-white shadow-xl dark:border-red-900/50 dark:bg-slate-900">
          <div className="h-1.5 bg-red-500" />
          <div className="p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
              <AlertTriangle className="h-7 w-7 text-red-500" />
            </div>
            <h2 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
              Impossible de charger les statistiques
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {error}
            </p>
            <button
              onClick={() => fetchStats()}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalClubs = stats?.clubs.total ?? 0;
  const activeClubs = stats?.clubs.actifs ?? 0;
  const presidents = stats?.presidents.actifs ?? 0;
  const pendingRequests = pendingReservationsCount;
  const approvedEvents = stats?.evenements.approuves ?? 0;
  const totalBudget = stats?.budget.total ?? 0;

  const clubsRatio = totalClubs > 0 ? clampPercentage(Math.round((activeClubs / totalClubs) * 100)) : 0;

  return (
    <div className="min-h-full bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8 lg:py-7">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ─────────────────────────────────────────────────────
            HERO
        ───────────────────────────────────────────────────── */}

        <motion.section
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-4 text-white shadow-lg sm:p-5"
        >
          <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full border-[30px] border-white/[0.03]" />
          <div className="pointer-events-none absolute -bottom-16 right-1/4 h-40 w-40 rounded-full bg-white/[0.04] blur-2xl" />

          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 backdrop-blur-sm">
                <CalendarDays className="h-3 w-3 text-slate-300" />
                <span className="text-[10px] font-medium capitalize text-slate-300">
                  {formatDate()}
                </span>
              </div>

              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                Vie Étudiante
                <span className="text-slate-400"> & Clubs</span>
              </h1>

              <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-400 sm:text-sm">
                Pilotez les clubs, les responsables, les événements et les
                réservations depuis un espace centralisé.
              </p>
            </div>

            <div className="flex items-center">
              <div className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 backdrop-blur-sm">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                  Clubs actifs
                </p>
                <p className="mt-0.5 text-lg font-bold">
                  {activeClubs}
                  <span className="ml-1 text-xs font-medium text-slate-400">/ {totalClubs}</span>
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Small connection warning */}
        {error && stats && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>
              Les dernières données disponibles sont affichées. Actualisation
              temporairement indisponible.
            </span>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────
            KPI GRID
        ───────────────────────────────────────────────────── */}

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <StatCard
            title="Clubs actifs"
            value={activeClubs}
            description={`${totalClubs} clubs enregistrés`}
            icon={Tent}
            iconClass="text-violet-600 dark:text-violet-400"
            iconBg="bg-violet-50 dark:bg-violet-900/20"
            progress={clubsRatio}
            progressLabel="Taux d'activité"
            onClick={() => onNavigate?.('clubs')}
            actionLabel="Gérer les clubs"
          />

          <StatCard
            title="Présidents"
            value={presidents}
            description="Responsables actuellement actifs"
            icon={Medal}
            iconClass="text-amber-600 dark:text-amber-400"
            iconBg="bg-amber-50 dark:bg-amber-900/20"
            onClick={() => onNavigate?.('presidents')}
            actionLabel="Voir les présidents"
          />

          <StatCard
            title="Événements validés"
            value={approvedEvents}
            description="Activités approuvées"
            icon={PartyPopper}
            iconClass="text-fuchsia-600 dark:text-fuchsia-400"
            iconBg="bg-fuchsia-50 dark:bg-fuchsia-900/20"
            onClick={() => onNavigate?.('evenements')}
            actionLabel="Gérer les événements"
          />

          <StatCard
            title="Budget associatif"
            value={formatCurrency(totalBudget)}
            description="Budget cumulé des clubs"
            icon={Wallet}
            iconClass="text-emerald-600 dark:text-emerald-400"
            iconBg="bg-emerald-50 dark:bg-emerald-900/20"
            onClick={() => onNavigate?.('clubs')}
            actionLabel="Consulter les clubs"
          />
        </motion.div>


        {/* ─────────────────────────────────────────────────────
            OPERATIONAL STATUS
        ───────────────────────────────────────────────────── */}

        <motion.section
          variants={itemVariants}
          initial="hidden"
          animate="show"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <SectionHeader
            icon={CheckCircle2}
            iconClass="text-emerald-500"
            title="Indicateurs opérationnels"
            description="Quelques éléments nécessitant votre attention"
          />

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <StatusCard
              title={`${pendingRequests} demande${pendingRequests > 1 ? 's' : ''} en attente`}
              subtitle="Éléments nécessitant un suivi"
              icon={Clock3}
              iconBgClass="bg-amber-100 dark:bg-amber-900/30"
              iconColorClass="text-amber-600 dark:text-amber-400"
              hoverBorderClass="hover:border-amber-200 dark:hover:border-amber-900"
              hoverBgClass="hover:bg-amber-50/40 dark:hover:bg-amber-900/10"
              arrowHoverClass="group-hover:text-amber-500"
              onClick={() => onNavigate?.('reservations')}
            />

            <StatusCard
              title="Réservations de salles"
              subtitle="Accéder à la gestion des espaces"
              icon={Building2}
              iconBgClass="bg-blue-100 dark:bg-blue-900/30"
              iconColorClass="text-blue-600 dark:text-blue-400"
              hoverBorderClass="hover:border-blue-200 dark:hover:border-blue-900"
              hoverBgClass="hover:bg-blue-50/40 dark:hover:bg-blue-900/10"
              arrowHoverClass="group-hover:text-blue-500"
              onClick={() => onNavigate?.('reservations')}
            />
          </div>
        </motion.section>

        {/* Footer */}
        <div className="flex items-center justify-between px-1 pb-2 text-[10px] text-slate-400 dark:text-slate-600">
          <span>SmartCampus · Vie Étudiante & Clubs</span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Données actualisées automatiquement
          </span>
        </div>
      </div>
    </div>
  );
}