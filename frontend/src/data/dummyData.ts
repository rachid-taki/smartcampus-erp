import type {
  Student,
  StudentRequest,
  StudentDocument,
  AppNotification,
  CalendarEvent,
  HistoryActivity,
} from '../types';

export const currentStudent: Student = {
  id: 'std-2026-0417',
  firstName: 'Rachid',
  lastName: 'TAKI',
  email: 'rachid.taki@ensiasd.ac.ma',
  phone: '+212 6 61 23 45 67',
  cne: 'R138204512',
  codeApogee: '19004521',
  filiere: 'MGSI — Management des Systèmes d\'Information',
  niveau: '5ème année',
  semestre: 'Semestre 9',
  anneeUniversitaire: '2025 / 2026',
  status: 'Actif',
  etablissement: 'ENSIASD',
};

export const studentRequests: StudentRequest[] = [
  {
    id: 'req-1',
    reference: 'DEM-2026-0142',
    type: 'Attestation',
    createdAt: '2026-07-24',
    updatedAt: '2026-07-25',
    status: 'Validée',
    description: 'Attestation de scolarité pour dossier bancaire.',
  },
  {
    id: 'req-2',
    reference: 'DEM-2026-0138',
    type: 'Convention de stage',
    createdAt: '2026-07-20',
    updatedAt: '2026-07-26',
    status: 'En cours',
    description: 'Convention de stage PFE — société Atlas Digital.',
  },
  {
    id: 'req-3',
    reference: 'DEM-2026-0129',
    type: 'Relevé de notes',
    createdAt: '2026-07-14',
    updatedAt: '2026-07-16',
    status: 'Validée',
  },
  {
    id: 'req-4',
    reference: 'DEM-2026-0121',
    type: 'Bourse',
    createdAt: '2026-07-10',
    updatedAt: '2026-07-10',
    status: 'En attente',
  },
  {
    id: 'req-5',
    reference: 'DEM-2026-0098',
    type: 'Carte étudiant',
    createdAt: '2026-06-29',
    updatedAt: '2026-07-02',
    status: 'Refusée',
    description: 'Photo non conforme — à resoumettre.',
  },
];

export const studentDocuments: StudentDocument[] = [
  {
    id: 'doc-1',
    name: 'CIN_recto_verso.pdf',
    type: 'application/pdf',
    sizeKb: 842,
    uploadedAt: '2026-07-22',
  },
  {
    id: 'doc-2',
    name: 'Releve_notes_S8.pdf',
    type: 'application/pdf',
    sizeKb: 1290,
    uploadedAt: '2026-07-18',
  },
  {
    id: 'doc-4',
    name: 'Photo_identite.jpg',
    type: 'image/jpeg',
    sizeKb: 310,
    uploadedAt: '2026-07-02',
  },
   {
    id: 'doc-5',
    name: 'Photo_identite.jpg',
    type: 'image/jpeg',
    sizeKb: 310,
    uploadedAt: '2026-07-02',
  },
];

export const notifications: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'Demande validée',
    message: 'Votre attestation de scolarité (DEM-2026-0142) est prête à être téléchargée.',
    category: 'demande',
    createdAt: '2026-07-25T10:32:00',
    read: false,
  },
  {
    id: 'notif-2',
    title: 'Nouveau document requis',
    message: 'Merci de compléter votre convention de stage avec la signature de l\'entreprise.',
    category: 'document',
    createdAt: '2026-07-24T15:05:00',
    read: false,
  },
  {
    id: 'notif-3',
    title: 'Examen programmé',
    message: 'Un examen de rattrapage "Systèmes Distribués" est prévu le 5 août.',
    category: 'calendrier',
    createdAt: '2026-07-23T09:00:00',
    read: true,
  },
  {
    id: 'notif-4',
    title: 'Maintenance planifiée',
    message: 'Le portail sera indisponible dimanche de 02h00 à 04h00 pour maintenance.',
    category: 'systeme',
    createdAt: '2026-07-20T18:20:00',
    read: true,
  },
];

export const calendarEvents: CalendarEvent[] = [
  {
    id: 'evt-1',
    title: 'Examen — Systèmes Distribués',
    date: '2026-08-05',
    kind: 'exam',
    location: 'Amphi B',
  },
  {
    id: 'evt-2',
    title: 'Réunion encadrement PFE',
    date: '2026-07-30',
    kind: 'meeting',
    location: 'Salle des professeurs',
  },
  {
    id: 'evt-3',
    title: 'Date limite dépôt convention',
    date: '2026-07-31',
    kind: 'deadline',
  },
  {
    id: 'evt-4',
    title: 'Vacances d\'été',
    date: '2026-08-10',
    kind: 'vacation',
  },
];

export const historyActivities: HistoryActivity[] = [
  {
    id: 'hist-1',
    kind: 'request_submitted',
    label: 'Demande soumise',
    detail: 'Convention de stage (DEM-2026-0138)',
    date: '2026-07-20T11:00:00',
  },
  {
    id: 'hist-2',
    kind: 'document_uploaded',
    label: 'Document déposé',
    detail: 'CIN_recto_verso.pdf',
    date: '2026-07-22T09:14:00',
  },
  {
    id: 'hist-3',
    kind: 'document_downloaded',
    label: 'Document téléchargé',
    detail: 'Attestation de scolarité',
    date: '2026-07-25T10:40:00',
  },
  {
    id: 'hist-4',
    kind: 'profile_updated',
    label: 'Profil mis à jour',
    detail: 'Numéro de téléphone modifié',
    date: '2026-07-18T08:22:00',
  },
];
export const universityAnnouncements = [
  {
    id: "1",
    title: "Réinscriptions 2026/2027",
    description:
      "Les réinscriptions sont ouvertes jusqu'au 15 septembre.",
    date: "15 Septembre",
    category: "Scolarité",
    isNew: true,
  },
  {
    id: "2",
    title: "Bourse de mérite",
    description:
      "Le dépôt des dossiers est ouvert jusqu'au 10 août.",
    date: "10 Août",
    category: "Bourse",
    isNew: false,
  },
  {
    id: "3",
    title: "Fermeture du service",
    description:
      "Le service de scolarité sera fermé vendredi après-midi.",
    date: "Vendredi",
    category: "Administration",
    isNew: false,
  },
];
