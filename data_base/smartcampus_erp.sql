-- =====================================================================
-- 100 REQUÊTES D'INSERTION POUR TEST D'INTERFACE SMARTCAMPUS ERP
-- =====================================================================

-- [1-3] ROLE
INSERT INTO role (id_role, nom_role, description) VALUES ('11111111-0000-0000-0000-000000000001', 'Administrateur', 'Accès total au système ERP');
INSERT INTO role (id_role, nom_role, description) VALUES ('11111111-0000-0000-0000-000000000002', 'Etudiant', 'Accès portail étudiant');
INSERT INTO role (id_role, nom_role, description) VALUES ('11111111-0000-0000-0000-000000000003', 'Professeur', 'Accès portail enseignant');

-- [4-6] PERMISSION
INSERT INTO permission (id_permission, nom, module, description) VALUES ('22222222-0000-0000-0000-000000000001', 'lire_notes', 'Scolarite', 'Voir les notes');
INSERT INTO permission (id_permission, nom, module, description) VALUES ('22222222-0000-0000-0000-000000000002', 'modifier_notes', 'Scolarite', 'Modifier les notes');
INSERT INTO permission (id_permission, nom, module, description) VALUES ('22222222-0000-0000-0000-000000000003', 'gerer_utilisateurs', 'Administration', 'Gestion des comptes');

-- [7-9] ROLE_PERMISSION
INSERT INTO role_permission (id_role, id_permission) VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000003');
INSERT INTO role_permission (id_role, id_permission) VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001');
INSERT INTO role_permission (id_role, id_permission) VALUES ('11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000002');

-- [10-17] UTILISATEUR (Comptes de base pour les héritages suivants)
INSERT INTO utilisateur (id_utilisateur, id_role, nom, prenom, email, mot_de_passe, telephone) VALUES ('33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', 'Alaoui', 'Youssef', 'youssef.alaoui@campus.ma', '$2a$12$DUMMYHASH1234567890123', '0600000001');
INSERT INTO utilisateur (id_utilisateur, id_role, nom, prenom, email, mot_de_passe, telephone) VALUES ('33333333-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002', 'Benali', 'Sara', 'sara.benali@campus.ma', '$2a$12$DUMMYHASH1234567890123', '0600000002');
INSERT INTO utilisateur (id_utilisateur, id_role, nom, prenom, email, mot_de_passe, telephone) VALUES ('33333333-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002', 'Mansouri', 'Amine', 'amine.mansouri@campus.ma', '$2a$12$DUMMYHASH1234567890123', '0600000003');
INSERT INTO utilisateur (id_utilisateur, id_role, nom, prenom, email, mot_de_passe, telephone) VALUES ('33333333-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000002', 'Chraibi', 'Kenza', 'kenza.chraibi@campus.ma', '$2a$12$DUMMYHASH1234567890123', '0600000004');
INSERT INTO utilisateur (id_utilisateur, id_role, nom, prenom, email, mot_de_passe, telephone) VALUES ('33333333-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000003', 'Idrissi', 'Hassan', 'hassan.idrissi@campus.ma', '$2a$12$DUMMYHASH1234567890123', '0600000005');
INSERT INTO utilisateur (id_utilisateur, id_role, nom, prenom, email, mot_de_passe, telephone) VALUES ('33333333-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000003', 'Tazi', 'Nawal', 'nawal.tazi@campus.ma', '$2a$12$DUMMYHASH1234567890123', '0600000006');
INSERT INTO utilisateur (id_utilisateur, id_role, nom, prenom, email, mot_de_passe, telephone) VALUES ('33333333-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000001', 'El Fassi', 'Omar', 'omar.elfassi@campus.ma', '$2a$12$DUMMYHASH1234567890123', '0600000007');
INSERT INTO utilisateur (id_utilisateur, id_role, nom, prenom, email, mot_de_passe, telephone) VALUES ('33333333-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000001', 'Amrani', 'Leila', 'leila.amrani@campus.ma', '$2a$12$DUMMYHASH1234567890123', '0600000008');

-- [18-19] FILIERE
INSERT INTO filiere (id_filiere, nom, departement, niveau, duree) VALUES ('44444444-0000-0000-0000-000000000001', 'Genie Informatique', 'Informatique', 'Ingenieur', 3);
INSERT INTO filiere (id_filiere, nom, departement, niveau, duree) VALUES ('44444444-0000-0000-0000-000000000002', 'Management Financier', 'Gestion', 'Master', 2);

-- [20-23] ETUDIANT
INSERT INTO etudiant (id_etudiant, id_filiere, cne, cin, code_apogee, niveau, statut) VALUES ('33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', 'R111111111', 'AB111111', 'APG1001', '1ere Annee', 'Actif');
INSERT INTO etudiant (id_etudiant, id_filiere, cne, cin, code_apogee, niveau, statut) VALUES ('33333333-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000001', 'R222222222', 'AB222222', 'APG1002', '2eme Annee', 'Actif');
INSERT INTO etudiant (id_etudiant, id_filiere, cne, cin, code_apogee, niveau, statut) VALUES ('33333333-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000002', 'R333333333', 'AB333333', 'APG1003', 'Master 1', 'Actif');
INSERT INTO etudiant (id_etudiant, id_filiere, cne, cin, code_apogee, niveau, statut) VALUES ('33333333-0000-0000-0000-000000000004', '44444444-0000-0000-0000-000000000002', 'R444444444', 'AB444444', 'APG1004', 'Master 2', 'Diplome');

-- [24-27] EMPLOYE
INSERT INTO employe (id_employe, matricule, fonction, departement, date_embauche, statut) VALUES ('33333333-0000-0000-0000-000000000005', 'MAT001', 'Professeur Chercheur', 'Informatique', '2015-09-01', 'Actif');
INSERT INTO employe (id_employe, matricule, fonction, departement, date_embauche, statut) VALUES ('33333333-0000-0000-0000-000000000006', 'MAT002', 'Professeur Vacataire', 'Gestion', '2019-02-15', 'Actif');
INSERT INTO employe (id_employe, matricule, fonction, departement, date_embauche, statut) VALUES ('33333333-0000-0000-0000-000000000007', 'MAT003', 'Agent Scolarite', 'Service aux Etudiants', '2018-11-01', 'Actif');
INSERT INTO employe (id_employe, matricule, fonction, departement, date_embauche, statut) VALUES ('33333333-0000-0000-0000-000000000008', 'MAT004', 'Responsable RH', 'Ressources Humaines', '2012-05-10', 'Actif');

-- [28-29] PROFESSEUR
INSERT INTO professeur (id_professeur, specialite, grade_academique, heures_hebdomadaires) VALUES ('33333333-0000-0000-0000-000000000005', 'Bases de donnees', 'PA', 12);
INSERT INTO professeur (id_professeur, specialite, grade_academique, heures_hebdomadaires) VALUES ('33333333-0000-0000-0000-000000000006', 'Comptabilite', 'PH', 8);

-- [30-30] SCOLARITE_STAFF
INSERT INTO scolarite_staff (id_scolarite, service, poste, bureau) VALUES ('33333333-0000-0000-0000-000000000007', 'Guichet Unique', 'Gestionnaire', 'A-102');

-- [31-31] RH_RESPONSABLE (et màj clé étrangère employe)
INSERT INTO rh_responsable (id_rh, service, poste, bureau) VALUES ('33333333-0000-0000-0000-000000000008', 'Pole Administratif', 'DRH', 'B-201');

-- [32-34] COURS
INSERT INTO cours (id_cours, code, nom, credits, coefficient) VALUES ('55555555-0000-0000-0000-000000000001', 'INF101', 'Architecture des SGBD', 5, 3);
INSERT INTO cours (id_cours, code, nom, credits, coefficient) VALUES ('55555555-0000-0000-0000-000000000002', 'GES201', 'Controle de Gestion', 4, 2);
INSERT INTO cours (id_cours, code, nom, credits, coefficient) VALUES ('55555555-0000-0000-0000-000000000003', 'DEV301', 'Developpement Backend', 6, 4);

-- [35-36] COURS_PROFESSEUR
INSERT INTO cours_professeur (id_cours, id_professeur) VALUES ('55555555-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000005');
INSERT INTO cours_professeur (id_cours, id_professeur) VALUES ('55555555-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000006');

-- [37-38] WORKFLOW
INSERT INTO workflow (id_workflow, nom, statut) VALUES ('66666666-0000-0000-0000-000000000001', 'Demande Attestation Scolarite', 'Actif');
INSERT INTO workflow (id_workflow, nom, statut) VALUES ('66666666-0000-0000-0000-000000000002', 'Demande Releve de Notes', 'Actif');

-- [39-40] TYPE_DEMANDE
INSERT INTO type_demande (id_type, libelle, code, id_workflow, delai_traitement) VALUES ('77777777-0000-0000-0000-000000000001', 'Attestation de Scolarite', 'ATT_SCOL', '66666666-0000-0000-0000-000000000001', 2);
INSERT INTO type_demande (id_type, libelle, code, id_workflow, delai_traitement) VALUES ('77777777-0000-0000-0000-000000000002', 'Releve de Notes', 'REL_NOTE', '66666666-0000-0000-0000-000000000002', 3);

-- [41-42] ETAPE_WORKFLOW
INSERT INTO etape_workflow (id_etape, id_workflow, ordre, nom, role_responsable, statut) VALUES ('88888888-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000001', 1, 'Verification Scolarite', 'Scolarite', 'En_Attente');
INSERT INTO etape_workflow (id_etape, id_workflow, ordre, nom, role_responsable, statut) VALUES ('88888888-0000-0000-0000-000000000002', '66666666-0000-0000-0000-000000000002', 1, 'Validation Departement', 'Chef Departement', 'En_Attente');

-- [43-45] DEMANDE
INSERT INTO demande (id_demande, numero, id_etudiant, id_type, id_workflow, objet, statut, priorite) VALUES ('99999999-0000-0000-0000-000000000001', 'DEM-2023-001', '33333333-0000-0000-0000-000000000001', '77777777-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000001', 'Besoin pour stage', 'Soumise', 'Normale');
INSERT INTO demande (id_demande, numero, id_etudiant, id_type, id_workflow, objet, statut, priorite) VALUES ('99999999-0000-0000-0000-000000000002', 'DEM-2023-002', '33333333-0000-0000-0000-000000000002', '77777777-0000-0000-0000-000000000002', '66666666-0000-0000-0000-000000000002', 'Dossier Master', 'En_Traitement', 'Haute');
INSERT INTO demande (id_demande, numero, id_etudiant, id_type, id_workflow, objet, statut, priorite) VALUES ('99999999-0000-0000-0000-000000000003', 'DEM-2023-003', '33333333-0000-0000-0000-000000000003', '77777777-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000001', 'Visa Etudiant', 'Validee', 'Urgente');

-- [46-47] TYPE_RECLAMATION
INSERT INTO type_reclamation (id_type, libelle, code, categorie, delai_limite) VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'Erreur de saisie de note', 'REC_NOTE', 'Note', 15);
INSERT INTO type_reclamation (id_type, libelle, code, categorie, delai_limite) VALUES ('aaaaaaaa-0000-0000-0000-000000000002', 'Probleme acces Email', 'REC_EMAIL', 'Email', 5);

-- [48-50] RECLAMATION
INSERT INTO reclamation (id_reclamation, id_etudiant, id_type, objet, statut) VALUES ('bbbbbbbb-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Note manquante SGBD', 'Soumise');
INSERT INTO reclamation (id_reclamation, id_etudiant, id_type, objet, statut) VALUES ('bbbbbbbb-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'Mot de passe perdu', 'Transmise');
INSERT INTO reclamation (id_reclamation, id_etudiant, id_type, objet, statut) VALUES ('bbbbbbbb-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Erreur module Gestion', 'Cloturee');

-- [51-53] DOCUMENT (Contrainte exclusive id_demande vs id_reclamation respectée)
INSERT INTO document (id_document, id_demande, id_reclamation, nom, type, url, taille) VALUES ('cccccccc-0000-0000-0000-000000000005', '99999999-0000-0000-0000-000000000001', NULL, 'CIN_Scan.pdf', 'application/pdf', 'https://drive.google.com/drive/u/0/home', 1024);
INSERT INTO document (id_document, id_demande, id_reclamation, nom, type, url, taille) VALUES ('cccccccc-0000-0000-0000-000000000002', '99999999-0000-0000-0000-000000000002', NULL, 'Photo.jpg', 'image/jpeg', 'https://s3/docs/photo.jpg', 2048);
INSERT INTO document (id_document, id_demande, id_reclamation, nom, type, url, taille) VALUES ('cccccccc-0000-0000-0000-000000000003', NULL, 'bbbbbbbb-0000-0000-0000-000000000001', 'Capture_Erreur.png', 'image/png', 'https://s3/docs/erreur.png', 512);

-- [54-55] CERTIFICAT_MEDICAL
INSERT INTO certificat_medical (id_certificat, id_etudiant, fichier_url, date_debut, date_fin, motif) VALUES ('dddddddd-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'https://s3/certifs/certif1.pdf', '2023-10-01', '2023-10-05', 'Grippe');
INSERT INTO certificat_medical (id_certificat, id_etudiant, fichier_url, date_debut, date_fin, motif) VALUES ('dddddddd-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000002', 'https://s3/certifs/certif2.pdf', '2023-11-10', '2023-11-12', 'Rendez-vous medical');

-- [56-57] VERIFICATION_EXAMEN
INSERT INTO verification_examen (id_verification, id_etudiant, id_professeur, motif, statut) VALUES ('eeeeeeee-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000005', 'Exercice 2 non comptabilise', 'Demandee');
INSERT INTO verification_examen (id_verification, id_etudiant, id_professeur, motif, statut) VALUES ('eeeeeeee-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000006', 'Note absente', 'Planifiee');

-- [58-60] DEMANDE_RH
INSERT INTO demande_rh (id_demande_rh, id_employe, type, statut, date_debut, date_fin) VALUES ('ffffffff-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000005', 'Conge_Normal', 'Soumise', '2024-01-02', '2024-01-15');
INSERT INTO demande_rh (id_demande_rh, id_employe, type, statut, date_debut, date_fin) VALUES ('ffffffff-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000007', 'Attestation_Travail', 'Validee', NULL, NULL);
INSERT INTO demande_rh (id_demande_rh, id_employe, type, statut, date_debut, date_fin) VALUES ('ffffffff-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000006', 'Conge_Maladie', 'En_Traitement', '2023-12-01', '2023-12-05');

-- [61-62] CLUB
INSERT INTO club (id_club, nom, description, budget) VALUES ('1a1a1a1a-0000-0000-0000-000000000001', 'Club Robotique', 'Creation de robots et AI', 5000.00);
INSERT INTO club (id_club, nom, description, budget) VALUES ('1a1a1a1a-0000-0000-0000-000000000002', 'Club Musique', 'Evenements artistiques', 2500.00);

-- [63-64] PRESIDENT_CLUB
INSERT INTO president_club (id_president, id_club, id_etudiant, date_designation) VALUES ('2b2b2b2b-0000-0000-0000-000000000001', '1a1a1a1a-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', '2023-09-01');
INSERT INTO president_club (id_president, id_club, id_etudiant, date_designation) VALUES ('2b2b2b2b-0000-0000-0000-000000000002', '1a1a1a1a-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000004', '2023-09-01');

-- [65-66] DEMANDE_CLUB
INSERT INTO demande_club (id_demande_club, id_club, id_president, type, objet, statut) VALUES ('3c3c3c3c-0000-0000-0000-000000000001', '1a1a1a1a-0000-0000-0000-000000000001', '2b2b2b2b-0000-0000-0000-000000000001', 'Evenement', 'Hackathon Annuel', 'En_Revue');
INSERT INTO demande_club (id_demande_club, id_club, id_president, type, objet, statut) VALUES ('3c3c3c3c-0000-0000-0000-000000000002', '1a1a1a1a-0000-0000-0000-000000000002', '2b2b2b2b-0000-0000-0000-000000000002', 'Salle', 'Repetition Concert', 'Approuvee');

-- [67-69] SALLE
INSERT INTO salle (id_salle, numero, capacite, type, statut) VALUES ('4d4d4d4d-0000-0000-0000-000000000001', 'Amphi A', 300, 'Amphitheatre', 'Disponible');
INSERT INTO salle (id_salle, numero, capacite, type, statut) VALUES ('4d4d4d4d-0000-0000-0000-000000000002', 'Salle 101', 40, 'Salle_Cours', 'Disponible');
INSERT INTO salle (id_salle, numero, capacite, type, statut) VALUES ('4d4d4d4d-0000-0000-0000-000000000003', 'Labo Reseau', 20, 'Laboratoire', 'Maintenance');

-- [70-72] SESSION_SALLE
INSERT INTO session_salle (id_session, id_salle, id_cours, id_professeur, date, heure_debut, heure_fin, statut) VALUES ('5e5e5e5e-0000-0000-0000-000000000001', '4d4d4d4d-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000005', '2023-11-20', '08:00:00', '10:00:00', 'Terminee');
INSERT INTO session_salle (id_session, id_salle, id_cours, id_professeur, date, heure_debut, heure_fin, statut) VALUES ('5e5e5e5e-0000-0000-0000-000000000002', '4d4d4d4d-0000-0000-0000-000000000002', '55555555-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000006', '2023-11-20', '10:15:00', '12:15:00', 'Planifiee');
INSERT INTO session_salle (id_session, id_salle, id_cours, id_professeur, date, heure_debut, heure_fin, statut) VALUES ('5e5e5e5e-0000-0000-0000-000000000003', '4d4d4d4d-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000005', '2023-11-21', '14:00:00', '16:00:00', 'Planifiee');

-- [73-76] PRESENCE_ETUDIANT
INSERT INTO presence_etudiant (id_presence, id_session, id_etudiant, statut, methode_identification) VALUES ('6f6f6f6f-0000-0000-0000-000000000001', '5e5e5e5e-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'Present', 'RFID');
INSERT INTO presence_etudiant (id_presence, id_session, id_etudiant, statut, methode_identification) VALUES ('6f6f6f6f-0000-0000-0000-000000000002', '5e5e5e5e-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000002', 'Retard', 'QR_Code');
INSERT INTO presence_etudiant (id_presence, id_session, id_etudiant, statut, methode_identification) VALUES ('6f6f6f6f-0000-0000-0000-000000000003', '5e5e5e5e-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000003', 'Absent', NULL);
INSERT INTO presence_etudiant (id_presence, id_session, id_etudiant, statut, methode_identification) VALUES ('6f6f6f6f-0000-0000-0000-000000000004', '5e5e5e5e-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000004', 'Excuse', NULL);

-- [77-78] RESERVATION_SALLE
INSERT INTO reservation_salle (id_reservation, id_salle, id_demandeur, date, heure_debut, heure_fin, statut) VALUES ('7a7a7a7a-0000-0000-0000-000000000001', '4d4d4d4d-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000001', '2023-12-01', '16:00:00', '18:00:00', 'Approuvee');
INSERT INTO reservation_salle (id_reservation, id_salle, id_demandeur, date, heure_debut, heure_fin, statut) VALUES ('7a7a7a7a-0000-0000-0000-000000000002', '4d4d4d4d-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000005', '2023-12-02', '09:00:00', '12:00:00', 'Demandee');

-- [79-80] ALERTE_IA
INSERT INTO alerte_ia (id_alerte, id_salle, type, description, priorite) VALUES ('8b8b8b8b-0000-0000-0000-000000000001', '4d4d4d4d-0000-0000-0000-000000000001', 'Surcharge', 'Nombre etudiants depasse capacite prevue', 'Haute');
INSERT INTO alerte_ia (id_alerte, id_salle, type, description, priorite) VALUES ('8b8b8b8b-0000-0000-0000-000000000002', '4d4d4d4d-0000-0000-0000-000000000002', 'Salle_Fantome', 'Lumiere allumee, aucun occupant detecte', 'Normale');

-- [81-82] CONVERSATION
INSERT INTO conversation (id_conversation, sujet, statut) VALUES ('9c9c9c9c-0000-0000-0000-000000000001', 'Support Inscription', 'Ouverte');
INSERT INTO conversation (id_conversation, sujet, statut) VALUES ('9c9c9c9c-0000-0000-0000-000000000002', 'Question Cours SGBD', 'Fermee');

-- [83-84] CONVERSATION_PARTICIPANT
INSERT INTO conversation_participant (id_conversation, id_utilisateur) VALUES ('9c9c9c9c-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001');
INSERT INTO conversation_participant (id_conversation, id_utilisateur) VALUES ('9c9c9c9c-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000007');

-- [85-86] MESSAGE
INSERT INTO message (id_message, id_conversation, id_expediteur, contenu, lu) VALUES ('0d0d0d0d-0000-0000-0000-000000000001', '9c9c9c9c-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'Bonjour, je narrive pas a telecharger mon releve', TRUE);
INSERT INTO message (id_message, id_conversation, id_expediteur, contenu, lu) VALUES ('0d0d0d0d-0000-0000-0000-000000000002', '9c9c9c9c-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000007', 'Bonjour, le probleme est en cours de resolution', FALSE);

-- [87-88] NOTIFICATION
INSERT INTO notification (id_notification, id_utilisateur, titre, message, type, priorite) VALUES ('1e1e1e1e-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'Demande Validee', 'Votre attestation est prete.', 'Push', 'Info');
INSERT INTO notification (id_notification, id_utilisateur, titre, message, type, priorite) VALUES ('1e1e1e1e-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000005', 'Nouvelle Session', 'Changement de salle pour votre cours', 'Email', 'Urgent');

-- [89-90] BASE_CONNAISSANCE
INSERT INTO base_connaissance (id_base, titre, contenu, categorie) VALUES ('2f2f2f2f-0000-0000-0000-000000000001', 'Reglement Interieur', 'Tout etudiant doit badger à l entree...', 'Regles');
INSERT INTO base_connaissance (id_base, titre, contenu, categorie) VALUES ('2f2f2f2f-0000-0000-0000-000000000002', 'Procedure Stage', 'Les conventions de stage doivent etre signees...', 'Scolarite');

-- [91-92] CONVERSATION_IA
INSERT INTO conversation_ia (id_conversation_ia, id_etudiant, statut, satisfaction) VALUES ('3a3a3a3a-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'Active', NULL);
INSERT INTO conversation_ia (id_conversation_ia, id_etudiant, statut, satisfaction) VALUES ('3a3a3a3a-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000002', 'Cloturee', 5);

-- [93-94] MESSAGE_IA
INSERT INTO message_ia (id_message_ia, id_conversation_ia, role, contenu, tokens) VALUES ('4b4b4b4b-0000-0000-0000-000000000001', '3a3a3a3a-0000-0000-0000-000000000001', 'User', 'Comment obtenir une convention ?', 15);
INSERT INTO message_ia (id_message_ia, id_conversation_ia, role, contenu, tokens) VALUES ('4b4b4b4b-0000-0000-0000-000000000002', '3a3a3a3a-0000-0000-0000-000000000001', 'Assistant', 'Veuillez telecharger le formulaire sur le portail.', 25);

-- [95-96] AUDIT_LOG
INSERT INTO audit_log (id_utilisateur, action, module, entite, entite_id, adresse_ip) VALUES ('33333333-0000-0000-0000-000000000007', 'UPDATE', 'Scolarite', 'demande', '99999999-0000-0000-0000-000000000001', '192.168.1.15');
INSERT INTO audit_log (id_utilisateur, action, module, entite, entite_id, adresse_ip) VALUES ('33333333-0000-0000-0000-000000000008', 'LOGIN', 'Auth', 'utilisateur', '33333333-0000-0000-0000-000000000008', '192.168.1.55');

-- [97-98] PARAMETRE_SYSTEME
INSERT INTO parametre_systeme (id_parametre, cle, valeur, type, module) VALUES ('5c5c5c5c-0000-0000-0000-000000000001', 'MAX_FILE_SIZE_MB', '5', 'Integer', 'System');
INSERT INTO parametre_systeme (id_parametre, cle, valeur, type, module) VALUES ('5c5c5c5c-0000-0000-0000-000000000002', 'ENABLE_IA_CHATBOT', 'true', 'Boolean', 'IA');

-- [99-100] CALENDRIER_ACADEMIQUE
INSERT INTO calendrier_academique (id_calendrier, nom, annee_scolaire, date_debut, date_fin) VALUES ('6d6d6d6d-0000-0000-0000-000000000001', 'Calendrier Officiel 2023', '2023-2024', '2023-09-04', '2024-07-15');
INSERT INTO calendrier_academique (id_calendrier, nom, annee_scolaire, date_debut, date_fin) VALUES ('6d6d6d6d-0000-0000-0000-000000000002', 'Calendrier Officiel 2024', '2024-2025', '2024-09-02', '2025-07-15');

-- =====================================================================
-- FIN DES 100 INSERTS
-- =====================================================================