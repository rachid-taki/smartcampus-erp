import type { NavItem } from './../types';

export const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', to: '/student/dashboard' },
  { id: 'profile', label: 'Mon Profil', icon: 'User', to: '/student/profile' },
  { id: 'requests', label: 'Mes Demandes', icon: 'FileText', to: '/student/requests' },
  { id: 'workflow', label: 'WorkFlow', icon: 'Workflow', to: '/student/workflow' },
  { id: 'documents', label: 'Documents', icon: 'FolderOpen', to: '/student/documents' },
  { id: 'notifications', label: 'Notifications', icon: 'Bell', to: '/student/notifications' },
  { id: 'calendar', label: 'Calendrier', icon: 'CalendarDays', to: '/student/calendrier' },
  { id: 'reclamations', label: 'Mes Réclamations', icon: 'Megaphone', to: '/student/reclamations' },
  { id: 'settings', label: 'Paramètres', icon: 'Settings', to: '/student/parametres' },
];
