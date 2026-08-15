import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { StudentRequest } from '../../../types';

interface RequestsOverviewChartProps { requests: StudentRequest[]; }

const STATUS_COLORS: Record<string, string> = {
  Soumise: "#3B82F6", "En attente": "#F59E0B", Validée: "#10B981", Refusée: "#EF4444", Clôturée: "#6B7280",
};

export default function RequestsOverviewChart({ requests }: RequestsOverviewChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    requests.forEach((r: any) => {
      let status = r.status ?? r.statut;
      switch (status) {
        case "En_Traitement": status = "En attente"; break;
        case "Validee": status = "Validée"; break;
        case "Rejetee": status = "Refusée"; break;
        case "Cloturee": status = "Clôturée"; break;
        case "Soumise": status = "Soumise"; break;
      }
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [requests]);

  const total = requests.length;

  return (
    <div className="card p-5">
      <h3 className="mb-0.5 text-[13px] font-bold text-slate-800 dark:text-slate-100">Répartition des demandes</h3>
      <p className="mb-4 text-[11px] text-slate-400 dark:text-slate-500">Par statut, toutes périodes confondues</p>

      <div className="relative flex items-center justify-center">
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={4} cornerRadius={6} stroke="none"
                onMouseEnter={(_, i) => setActiveIndex(i)} onMouseLeave={() => setActiveIndex(null)}>
                {data.slice(0, 5).map((entry, i) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#94A3B8'} opacity={activeIndex === null || activeIndex === i ? 1 : 0.35} style={{ transition: 'opacity 150ms ease' }} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 11.5, boxShadow: '0 8px 24px rgba(15,23,42,0.08)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="pointer-events-none absolute flex flex-col items-center">
          <span className="text-2xl font-bold leading-none text-slate-900 dark:text-white">{total}</span>
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">au total</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-1.5">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
            <span className="h-2 w-2 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: STATUS_COLORS[entry.name] ?? '#94A3B8' }} />
            <span className="truncate">{entry.name}</span>
            <span className="ml-auto font-bold text-slate-700 dark:text-slate-300">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}