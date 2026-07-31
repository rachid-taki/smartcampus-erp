// ============================================================
// SmartCampus ERP — Student Portal — Shared Types
// ============================================================

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cne: string;
  codeApogee: string;
  filiere: string;
  niveau: string;
  semestre: string;
  anneeUniversitaire: string;
  status: 'Actif' | 'Suspendu' | 'Diplômé';
  avatarUrl?: string;
  etablissement: string;
}

export type RequestStatus = 'En attente' | 'En cours' | 'Validée' | 'Refusée';

export type RequestType =
  | 'Attestation'
  | 'Convention de stage'
  | 'Carte étudiant'
  | 'Relevé de notes'
  | 'Diplôme'
  | 'Bourse'
  | 'Réclamation'
  | 'Autre';

export interface StudentRequest {
  id: string;
  reference: string;
  type: RequestType;
  createdAt: string;
  updatedAt: string;
  status: RequestStatus;
  description?: string;
}

export interface StudentDocument {
  id: string;
  name: string;
  type: string;
  sizeKb: number;
  uploadedAt: string;
  url?: string;
  progress?: number;
}

export type NotificationCategory = 'demande' | 'document' | 'calendrier' | 'systeme';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  createdAt: string;
  read: boolean;
}

export type EventKind = 'exam' | 'vacation' | 'meeting' | 'deadline';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  kind: EventKind;
  location?: string;
}

export type HistoryActivityKind =
  | 'request_submitted'
  | 'document_downloaded'
  | 'document_uploaded'
  | 'profile_updated'
  | 'notification';

export interface HistoryActivity {
  id: string;
  kind: HistoryActivityKind;
  label: string;
  detail?: string;
  date: string;
}

export interface StatCardData {
  id: string;
  title: string;
  value: number | string;
  description: string;
  icon: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  sparkline?: number[];
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  to: string;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  to: string;
}
