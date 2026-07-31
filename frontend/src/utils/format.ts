import type { RequestStatus, EventKind } from '@/types';

export function formatDate(iso: string, withTime = false): string {
  const date = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = withTime
    ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'long', year: 'numeric' };
  return new Intl.DateTimeFormat('fr-FR', opts).format(date);
}

export function formatRelative(iso: string): string {
  const now = new Date();
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffHour < 24) return `Il y a ${diffHour} h`;
  if (diffDay < 7) return `Il y a ${diffDay} j`;
  return formatDate(iso);
}

export const statusStyles: Record<RequestStatus, string> = {
  'En attente': 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  'En cours': 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
  Validée: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  Refusée: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
};

export const eventKindStyles: Record<EventKind, { label: string; className: string }> = {
  exam: { label: 'Examen', className: 'bg-red-50 text-red-700 ring-red-200' },
  vacation: { label: 'Vacances', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  meeting: { label: 'Réunion', className: 'bg-blue-50 text-blue-700 ring-blue-200' },
  deadline: { label: 'Échéance', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
};

export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
