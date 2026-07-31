import type { NavItem } from './../types';

export const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', to: '/' },
  { id: 'profile', label: 'Mon Profil', icon: 'User', to: '/profil' },
  { id: 'requests', label: 'Mes Demandes', icon: 'FileText', to: '/demandes' },
  { id: 'new-request', label: 'Nouvelle Demande', icon: 'FilePlus2', to: '/demandes/nouvelle' },
  { id: 'documents', label: 'Documents', icon: 'FolderOpen', to: '/documents' },
  { id: 'notifications', label: 'Notifications', icon: 'Bell', to: '/notifications' },
  { id: 'calendar', label: 'Calendrier', icon: 'CalendarDays', to: '/calendrier' },
  { id: 'history', label: 'Historique', icon: 'History', to: '/historique' },
  { id: 'settings', label: 'Paramètres', icon: 'Settings', to: '/parametres' },
];
