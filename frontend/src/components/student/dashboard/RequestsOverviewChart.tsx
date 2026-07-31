import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { StudentRequest } from '../../../types';

interface RequestsOverviewChartProps {
  requests: StudentRequest[];
}

const STATUS_COLORS: Record<string, string> = {
  'En attente': '#93C5FD',
  'En cours': '#3B82F6',
  Validée: '#1D4ED8',
  Refusée: '#f70909',
};

export default function RequestsOverviewChart({ requests }: RequestsOverviewChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    requests.forEach((r) => {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    });
    return Object.entries(counts).map(([status, value]) => ({ name: status, value }));
  }, [requests]);

  const total = requests.length;

  return (
    <div className="card p-5">
      <h3 className="mb-1 text-[14px] font-bold text-slate-800 dark:text-slate-100">
        Répartition des demandes
      </h3>
      <p className="mb-2 text-[12px] text-slate-400">Par statut, toutes périodes confondues</p>

      <div className="relative flex items-center justify-center">
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={54}
                outerRadius={78}
                paddingAngle={3}
                cornerRadius={6}
                stroke="none"
                onMouseEnter={(_, i) => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {data.slice(0, 4).map((entry, i) => (
                  <Cell
                    key={entry.name}
                    fill={STATUS_COLORS[entry.name] ?? '#94A3B8'}
                    opacity={activeIndex === null || activeIndex === i ? 1 : 0.35}
                    style={{ transition: 'opacity 150ms ease' }}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #E2E8F0',
                  fontSize: 12.5,
                  boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Center label */}
        <div className="pointer-events-none absolute flex flex-col items-center">
          <span className="text-[22px] font-bold leading-none text-slate-900 dark:text-white">
            {total}
          </span>
          <span className="text-[11px] text-slate-400">au total</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[entry.name] ?? '#94A3B8' }}
            />
            <span className="truncate">{entry.name}</span>
            <span className="ml-auto font-semibold text-slate-600 dark:text-slate-300">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
