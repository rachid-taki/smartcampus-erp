import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarEvent } from '../../../types';
import { eventKindStyles } from '../../../utils/format';

interface MiniCalendarProps {
  events: CalendarEvent[];
}

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export default function MiniCalendar({ events }: MiniCalendarProps) {
  const [cursor, setCursor] = useState(new Date(2026, 6, 1)); // July 2026

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((e) => {
      const key = e.date;
      map.set(key, [...(map.get(key) ?? []), e]);
    });
    return map;
  }, [events]);

  const { weeks, monthLabel } = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: { date: Date | null; iso: string | null }[] = [];
    for (let i = 0; i < startOffset; i++) cells.push({ date: null, iso: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const iso = date.toISOString().slice(0, 10);
      cells.push({ date, iso });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, iso: null });

    const weekChunks = [];
    for (let i = 0; i < cells.length; i += 7) weekChunks.push(cells.slice(i, i + 7));

    return { weeks: weekChunks, monthLabel: `${MONTH_NAMES[month]} ${year}` };
  }, [cursor]);

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">
          Calendrier académique
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Mois précédent"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="w-28 text-center text-[12.5px] font-semibold text-slate-600 dark:text-slate-300">
            {monthLabel}
          </span>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Mois suivant"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((wd, i) => (
          <span key={i} className="py-1 text-[11px] font-semibold text-slate-400">
            {wd}
          </span>
        ))}

        {weeks.flat().map((cell, i) => {
          const dayEvents = cell.iso ? eventsByDay.get(cell.iso) : undefined;
          return (
            <div
              key={i}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-[12px] ${
                cell.date
                  ? 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60'
                  : ''
              }`}
            >
              {cell.date && cell.date.getDate()}
              {dayEvents && dayEvents.length > 0 && (
                <span
                  className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${
                    eventKindStyles[dayEvents[0].kind].className.split(' ')[0]
                  }`}
                  style={{ backgroundColor: 'currentColor' }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-3 text-[11px] text-slate-400 dark:border-slate-800">
        {(['exam', 'meeting', 'deadline', 'vacation'] as const).map((kind) => (
          <span key={kind} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${eventKindStyles[kind].className.split(' ')[0]}`} />
            {eventKindStyles[kind].label}
          </span>
        ))}
      </div>
    </div>
  );
}
