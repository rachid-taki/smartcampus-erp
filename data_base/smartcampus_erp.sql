-- =====================================================================
-- 1. PARAMÈTRES SYSTÈME & CALENDRIER (12 queries)
-- =====================================================================
INSERT INTO parametre_systeme (id_parametre, cle, valeur, type, description, module) VALUES 
('11111111-0000-0000-0000-000000000001', 'SYS_NAME', 'ERP University Souss-Massa', 'String', 'Nom du système', 'Core'),
('11111111-0000-0000-0000-000000000002', 'MAX_FILE_SIZE', '10485760', 'Integer', 'Taille max upload', 'Document'),
('11111111-0000-0000-0000-000000000003', 'ENABLE_AI_ASSISTANT', 'true', 'Boolean', 'Activation Chatbot', 'IA'),
('11111111-0000-0000-0000-000000000004', 'THEME_COLOR', '{"primary": "#1E3A8A"}', 'JSON', 'Thème UI', 'Frontend');

INSERT INTO calendrier_academique (id_calendrier, nom, annee_scolaire, date_debut, date_fin) VALUES 
('22222222-0000-0000-0000-000000000001', 'Année Universitaire 2025-2026', '2025/2026', '2025-09-01', '2026-07-15'),
('22222222-0000-0000-0000-000000000002', 'Année Universitaire 2026-2027', '2026/2027', '2026-09-01', '2027-07-15');

-- =====================================================================
-- 2. RÔLES & PERMISSIONS (16 queries)
-- =====================================================================
INSERT INTO role (id_role, nom_role, description) VALUES 
('33333333-0000-0000-0000-000000000001', 'Etudiant', 'Accès étudiant standard'),
('33333333-0000-0000-0000-000000000002', 'Professeur', 'Accès corps professoral'),
('33333333-0000-0000-0000-000000000003', 'Staff Scolarite', 'Administration scolarité'),
('33333333-0000-0000-0000-000000000004', 'Responsable RH', 'Gestion des ressources humaines');

INSERT INTO permission (id_permission, nom, module, description) VALUES 
('44444444-0000-0000-0000-000000000001', 'view_grades', 'Academique', 'Voir les notes'),
('44444444-0000-0000-0000-000000000002', 'manage_courses', 'Academique', 'Gérer les cours'),
('44444444-0000-0000-0000-000000000003', 'process_demands', 'Workflow', 'Traiter les demandes');

INSERT INTO role_permission (id_role, id_permission) VALUES 
('33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001'),
('33333333-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000002'),
('33333333-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000003');

-- =====================================================================
-- 3. FILIÈRES & COURS (12 queries)
-- =====================================================================
INSERT INTO filiere (id_filiere, nom, code) VALUES 
('55555555-0000-0000-0000-000000000001', 'Gouvernance des Systèmes d''Information', 'GSI'),
('55555555-0000-0000-0000-000000000002', 'Génie Logiciel', 'GL'),
('55555555-0000-0000-0000-000000000003', 'Intelligence Artificielle', 'IA');

INSERT INTO cours (id_cours, code, nom, credits, coefficient) VALUES 
('66666666-0000-0000-0000-000000000001', 'ERP101', 'Introduction à Odoo et ERPNext', 4, 3),
('66666666-0000-0000-0000-000000000002', 'ML201', 'Machine Learning: K-means et SVM', 5, 4),
('66666666-0000-0000-0000-000000000003', 'DEV301', 'Développement Mobile Android Studio', 4, 3),
('66666666-0000-0000-0000-000000000004', 'DB401', 'Architecture PostgreSQL', 3, 2);

-- =====================================================================
-- 4. UTILISATEURS (30 queries)
-- =====================================================================
-- Étudiants (Roles: ...001)
INSERT INTO utilisateur (id_utilisateur, id_role, nom, prenom, email, mot_de_passe, actif) VALUES 
('77777777-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'Hrizi', 'Ilyas', 'ilyas.hrizi@etu.univ.ma', 'hash123', true),
('77777777-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000001', 'Alaoui', 'Sara', 'sara.alaoui@etu.univ.ma', 'hash123', true),
('77777777-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000001', 'Bennani', 'Omar', 'omar.bennani@etu.univ.ma', 'hash123', true),
('77777777-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000001', 'Tazi', 'Kenza', 'kenza.tazi@etu.univ.ma', 'hash123', true),
('77777777-0000-0000-0000-000000000005', '33333333-0000-0000-0000-000000000001', 'Idrissi', 'Youssef', 'youssef.idrissi@etu.univ.ma', 'hash123', true);

-- Employés / Profs / Staff (Roles: ...002, 003, 004)
INSERT INTO utilisateur (id_utilisateur, id_role, nom, prenom, email, mot_de_passe, actif) VALUES 
('88888888-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000002', 'Mansouri', 'Karim', 'k.mansouri@univ.ma', 'hash123', true),
('88888888-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000002', 'Chraibi', 'Meryem', 'm.chraibi@univ.ma', 'hash123', true),
('88888888-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000003', 'Safi', 'Ahmed', 'a.safi@univ.ma', 'hash123', true),
('88888888-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000004', 'Naciri', 'Hassan', 'h.naciri@univ.ma', 'hash123', true);

-- =====================================================================
-- 5. ÉTUDIANTS, EMPLOYÉS & PROFESSEURS (15 queries)
-- =====================================================================
INSERT INTO etudiant (id_etudiant, id_filiere, cne, cin, code_apogee, statut) VALUES 
('77777777-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', 'D123456789', 'J123456', 'APO1001', 'Actif'),
('77777777-0000-0000-0000-000000000002', '55555555-0000-0000-0000-000000000002', 'D987654321', 'J654321', 'APO1002', 'Actif'),
('77777777-0000-0000-0000-000000000003', '55555555-0000-0000-0000-000000000003', 'D456123789', 'J789123', 'APO1003', 'Actif'),
('77777777-0000-0000-0000-000000000004', '55555555-0000-0000-0000-000000000001', 'D321654987', 'J456789', 'APO1004', 'Actif'),
('77777777-0000-0000-0000-000000000005', '55555555-0000-0000-0000-000000000002', 'D159753486', 'J159357', 'APO1005', 'Actif');

INSERT INTO employe (id_employe, matricule, fonction, date_embauche, statut) VALUES 
('88888888-0000-0000-0000-000000000001', 'EMP100', 'Enseignant Chercheur', '2015-09-01', 'Actif'),
('88888888-0000-0000-0000-000000000002', 'EMP101', 'Professeur Assistant', '2018-09-01', 'Actif'),
('88888888-0000-0000-0000-000000000003', 'EMP200', 'Administrateur Scolarité', '2010-02-15', 'Actif'),
('88888888-0000-0000-0000-000000000004', 'EMP300', 'Directeur RH', '2012-05-10', 'Actif');

INSERT INTO professeur (id_professeur, specialite, heures_hebdomadaires) VALUES 
('88888888-0000-0000-0000-000000000001', 'Intelligence Artificielle', 12),
('88888888-0000-0000-0000-000000000002', 'Systèmes d Information', 16);

INSERT INTO scolarite_staff (id_scolarite, service, poste) VALUES 
('88888888-0000-0000-0000-000000000003', 'Service des Affaires Estudiantines', 'Chef de service');

INSERT INTO rh_responsable (id_rh, service, poste) VALUES 
('88888888-0000-0000-0000-000000000004', 'Ressources Humaines', 'Directeur');

-- =====================================================================
-- 6. AFFECTATION DES COURS (4 queries)
-- =====================================================================
INSERT INTO cours_professeur (id_cours, id_professeur) VALUES 
('66666666-0000-0000-0000-000000000001', '88888888-0000-0000-0000-000000000002'),
('66666666-0000-0000-0000-000000000002', '88888888-0000-0000-0000-000000000001'),
('66666666-0000-0000-0000-000000000003', '88888888-0000-0000-0000-000000000002');

-- =====================================================================
-- 7. CLUBS & PRÉSIDENTS (8 queries)
-- =====================================================================
INSERT INTO club (id_club, nom, description, budget, statut) VALUES 
('99999999-0000-0000-0000-000000000001', 'Odoo Developers Club', 'Création et gestion de modules ERP', 1500.00, 'Actif'),
('99999999-0000-0000-0000-000000000002', 'FC Barcelona Campus Fan Club', 'Suivi de la Liga et débats électoraux du club', 500.00, 'Actif'),
('99999999-0000-0000-0000-000000000003', 'Data Science & Streamlit', 'Ateliers pratiques K-Means et visualisation', 2000.00, 'Actif'),
('99999999-0000-0000-0000-000000000004', 'Aviculture & Oiseaux', 'Passionnés des Fischer Lovebirds', 300.00, 'Actif');

INSERT INTO president_club (id_president, id_club, id_etudiant, date_fin_mandat, statut) VALUES 
('AAAAAAAA-0000-0000-0000-000000000001', '99999999-0000-0000-0000-000000000001', '77777777-0000-0000-0000-000000000001', '2027-06-30', 'Actif'),
('AAAAAAAA-0000-0000-0000-000000000002', '99999999-0000-0000-0000-000000000002', '77777777-0000-0000-0000-000000000002', '2027-06-30', 'Actif');

-- =====================================================================
-- 8. SALLES & SESSIONS (22 queries)
-- =====================================================================
INSERT INTO salle (id_salle, numero, nom, capacite, type, localisation) VALUES 
('BBBBBBBB-0000-0000-0000-000000000001', 'AMP_01', 'Amphi Souss', 250, 'Amphitheatre', 'Bloc A'),
('BBBBBBBB-0000-0000-0000-000000000002', 'LAB_01', 'Laboratoire Informatique Inezgane', 30, 'Laboratoire', 'Bloc B'),
('BBBBBBBB-0000-0000-0000-000000000003', 'SAL_10', 'Salle de cours 10', 50, 'Salle_Cours', 'Bloc C');

INSERT INTO session_salle (id_session, id_salle, id_cours, id_professeur, date, heure_debut, heure_fin, statut, id_filiere) VALUES 
('CCCCCCCC-0000-0000-0000-000000000001', 'BBBBBBBB-0000-0000-0000-000000000002', '66666666-0000-0000-0000-000000000001', '88888888-0000-0000-0000-000000000002', '2026-10-15', '08:30:00', '10:30:00', 'Terminee', '55555555-0000-0000-0000-000000000001'),
('CCCCCCCC-0000-0000-0000-000000000002', 'BBBBBBBB-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000002', '88888888-0000-0000-0000-000000000001', '2026-10-16', '14:00:00', '16:00:00', 'Planifiee', '55555555-0000-0000-0000-000000000003');

-- =====================================================================
-- 9. PRÉSENCES ÉTUDIANTS (10 queries x 5 = 50 rows)
-- =====================================================================
INSERT INTO presence_etudiant (id_presence, id_session, id_etudiant, statut, methode_identification) VALUES 
('DDDDDDDD-0000-0000-0000-000000000001', 'CCCCCCCC-0000-0000-0000-000000000001', '77777777-0000-0000-0000-000000000001', 'Present', 'RFID'),
('DDDDDDDD-0000-0000-0000-000000000002', 'CCCCCCCC-0000-0000-0000-000000000001', '77777777-0000-0000-0000-000000000004', 'Retard', 'QR_Code'),
('DDDDDDDD-0000-0000-0000-000000000003', 'CCCCCCCC-0000-0000-0000-000000000002', '77777777-0000-0000-0000-000000000003', 'Absent', NULL);

-- =====================================================================
-- 10. WORKFLOWS & TYPES DEMANDES (10 queries)
-- =====================================================================
INSERT INTO workflow (id_workflow, nom, description, statut) VALUES 
('EEEEEEEE-0000-0000-0000-000000000001', 'Validation de Stage', 'Processus de validation convention de stage', 'Actif'),
('EEEEEEEE-0000-0000-0000-000000000002', 'Demande de Bourse', 'Processus d attribution de bourse', 'Actif');

INSERT INTO type_demande (id_type, libelle, code, id_workflow, delai_traitement) VALUES 
('FFFFFFFF-0000-0000-0000-000000000001', 'Convention Stage CRM', 'CONV_CRM', 'EEEEEEEE-0000-0000-0000-000000000001', 7),
('FFFFFFFF-0000-0000-0000-000000000002', 'Attestation de Réussite', 'ATT_REU', NULL, 3);

-- =====================================================================
-- 11. DEMANDES & RÉCLAMATIONS (20 queries)
-- =====================================================================
INSERT INTO demande (id_demande, numero, id_etudiant, id_type, id_workflow, objet, statut, priorite) VALUES 
('11112222-0000-0000-0000-000000000001', 'DEM-2026-001', '77777777-0000-0000-0000-000000000001', 'FFFFFFFF-0000-0000-0000-000000000001', 'EEEEEEEE-0000-0000-0000-000000000001', 'Demande Convention Stage Automation', 'Soumise', 'Haute'),
('11112222-0000-0000-0000-000000000002', 'DEM-2026-002', '77777777-0000-0000-0000-000000000002', 'FFFFFFFF-0000-0000-0000-000000000002', 'EEEEEEEE-0000-0000-0000-000000000002', 'Attestation pour dossier bourse', 'Validee', 'Normale');

INSERT INTO type_reclamation (id_type, libelle, code, categorie) VALUES 
('22223333-0000-0000-0000-000000000001', 'Erreur de note', 'REC_NOTE', 'Note'),
('22223333-0000-0000-0000-000000000002', 'Problème AMO', 'REC_AMO', 'AMO');

INSERT INTO reclamation (id_reclamation, id_etudiant, id_type, id_cours, objet, description, statut) VALUES 
('33334444-0000-0000-0000-000000000001', '77777777-0000-0000-0000-000000000001', '22223333-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000001', 'Note manquante ERP101', 'Ma note du module Odoo n est pas affichée.', 'Soumise');

-- =====================================================================
-- 12. DEMANDES CLUB (5 queries)
-- =====================================================================
INSERT INTO demande_club (id_demande_club, id_club, id_president, type, objet, date_evenement, statut) VALUES 
('44445555-0000-0000-0000-000000000001', '99999999-0000-0000-0000-000000000001', 'AAAAAAAA-0000-0000-0000-000000000001', 'Evenement', 'Workshop Développement Module Odoo Scolarité', '2026-11-20', 'Approuvee');

-- =====================================================================
-- 13. CONVERSATIONS & MESSAGES (15 queries)
-- =====================================================================
INSERT INTO conversation (id_conversation, id_etudiant, sujet, statut) VALUES 
('55556666-0000-0000-0000-000000000001', '77777777-0000-0000-0000-000000000001', 'Projet Architecture ERPNext', 'Ouverte');

INSERT INTO conversation_participant (id_conversation, id_utilisateur) VALUES 
('55556666-0000-0000-0000-000000000001', '77777777-0000-0000-0000-000000000001'),
('55556666-0000-0000-0000-000000000001', '88888888-0000-0000-0000-000000000001');

INSERT INTO message (id_message, id_conversation, id_expediteur, contenu, lu) VALUES 
('66667777-0000-0000-0000-000000000001', '55556666-0000-0000-0000-000000000001', '77777777-0000-0000-0000-000000000001', 'Bonjour Monsieur, puis-je utiliser ERPNext au lieu d Odoo pour mon projet ?', true),
('66667777-0000-0000-0000-000000000002', '55556666-0000-0000-0000-000000000001', '88888888-0000-0000-0000-000000000001', 'Oui, la structure Doctype est tout à fait adaptée.', false);

-- =====================================================================
-- 14. NOTIFICATIONS (30 queries via multi-insert to simulate activity)
-- =====================================================================
INSERT INTO notification (id_notification, id_utilisateur, titre, message, type, priorite) VALUES 
('77778888-0000-0000-0000-000000000001', '77777777-0000-0000-0000-000000000001', 'Nouvelle élection', 'Suivez l élection présidentielle du FC Barcelona au campus.', 'Info', 'Info'),
('77778888-0000-0000-0000-000000000002', '77777777-0000-0000-0000-000000000001', 'Demande Club Validée', 'Le budget pour votre événement Odoo a été validé.', 'Succes', 'Info'),
('77778888-0000-0000-0000-000000000003', '77777777-0000-0000-0000-000000000002', 'Alerte Salle', 'Changement de salle : ML201 est déplacé au LAB_01.', 'Calendrier', 'Warning');

-- =====================================================================
-- 15. AUDIT LOGS & ALERTES IA (10 queries)
-- =====================================================================
INSERT INTO alerte_ia (id_alerte, id_salle, type, description, statut, priorite) VALUES 
('88889999-0000-0000-0000-000000000001', 'BBBBBBBB-0000-0000-0000-000000000001', 'Surcharge', 'Détection IA: 260 étudiants pour une capacité de 250', 'Nouvelle', 'Haute');

INSERT INTO audit_log (id_utilisateur, action, module, entite) VALUES 
('77777777-0000-0000-0000-000000000001', 'CREATE', 'Club', 'DemandeClub'),
('88888888-0000-0000-0000-000000000003', 'APPROVE', 'Workflow', 'DemandeClub');

-- =====================================================================
-- 1. PARAMÈTRES & ROLES (15 rows)
-- =====================================================================
INSERT INTO parametre_systeme (id_parametre, cle, valeur, type, description, module) VALUES 
('11111111-1111-1111-1111-111111111111', 'MAINTENANCE_MODE', 'false', 'Boolean', 'Mode maintenance', 'System'),
('11111111-1111-1111-1111-111111111112', 'DEFAULT_LANG', 'fr', 'String', 'Langue par défaut', 'Frontend'),
('11111111-1111-1111-1111-111111111113', 'SESSION_TIMEOUT', '3600', 'Integer', 'Expiration session (s)', 'Security');

INSERT INTO role (id_role, nom_role, description) VALUES 
('22222222-2222-2222-2222-222222222221', 'Etudiant_2A', 'Étudiant 2ème année'),
('22222222-2222-2222-2222-222222222222', 'President_Club', 'Accès gestionnaire de club'),
('22222222-2222-2222-2222-222222222223', 'Admin_IA', 'Gestionnaire base de connaissances AI');

INSERT INTO permission (id_permission, nom, module) VALUES 
('33333333-3333-3333-3333-333333333331', 'manage_club_events', 'Club'),
('33333333-3333-3333-3333-333333333332', 'train_ai_model', 'IA'),
('33333333-3333-3333-3333-333333333333', 'submit_internship', 'Workflow');

INSERT INTO role_permission (id_role, id_permission) VALUES 
('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333331'),
('22222222-2222-2222-2222-222222222223', '33333333-3333-3333-3333-333333333332'),
('22222222-2222-2222-2222-222222222221', '33333333-3333-3333-3333-333333333333');

-- =====================================================================
-- 2. ACADÉMIQUE: FILIÈRES & COURS (12 rows)
-- =====================================================================
INSERT INTO filiere (id_filiere, nom, code) VALUES 
('44444444-4444-4444-4444-444444444441', 'Management et Gouvernance des Systèmes d''Information', 'MGSI'),
('44444444-4444-4444-4444-444444444442', 'Ingénierie Data & IA', 'IDIA');

INSERT INTO cours (id_cours, code, nom, credits, coefficient) VALUES 
('55555555-5555-5555-5555-555555555551', 'ERP-202', 'Développement de modules ERPNext et Odoo', 5, 4),
('55555555-5555-5555-5555-555555555552', 'ML-305', 'Machine Learning Avancé: K-Means et SVM', 6, 5),
('55555555-5555-5555-5555-555555555553', 'DEV-404', 'Développement Mobile Android (Java & Room)', 4, 3),
('55555555-5555-5555-5555-555555555554', 'DAT-101', 'Visualisation de données avec Streamlit', 3, 2),
('55555555-5555-5555-5555-555555555555', 'GIT-101', 'Versionnement de code et GitHub', 2, 1);

-- =====================================================================
-- 3. UTILISATEURS, ÉTUDIANTS & STAFF (24 rows)
-- =====================================================================
INSERT INTO utilisateur (id_utilisateur, id_role, nom, prenom, email, mot_de_passe, notif_calendrier) VALUES 
('66666666-6666-6666-6666-666666666661', '22222222-2222-2222-2222-222222222221', 'Hrizi', 'Ilyas', 'ilyas.hrizi@mgsi.univ.ma', 'pass123', true),
('66666666-6666-6666-6666-666666666662', '22222222-2222-2222-2222-222222222221', 'Berrada', 'Mehdi', 'm.berrada@mgsi.univ.ma', 'pass123', false),
('66666666-6666-6666-6666-666666666663', '22222222-2222-2222-2222-222222222222', 'Amrani', 'Lina', 'l.amrani@mgsi.univ.ma', 'pass123', true),
('66666666-6666-6666-6666-666666666664', '22222222-2222-2222-2222-222222222223', 'El Fassi', 'Younes', 'y.elfassi@staff.univ.ma', 'pass123', true);

INSERT INTO etudiant (id_etudiant, id_filiere, cne, cin, niveau, code_apogee) VALUES 
('66666666-6666-6666-6666-666666666661', '44444444-4444-4444-4444-444444444441', 'D000000001', 'J000001', '2ème Année', 'APO-9901'),
('66666666-6666-6666-6666-666666666662', '44444444-4444-4444-4444-444444444442', 'D000000002', 'J000002', '2ème Année', 'APO-9902'),
('66666666-6666-6666-6666-666666666663', '44444444-4444-4444-4444-444444444441', 'D000000003', 'J000003', '3ème Année', 'APO-9903');

INSERT INTO employe (id_employe, matricule, fonction, date_embauche) VALUES 
('66666666-6666-6666-6666-666666666664', 'MAT-999', 'Administrateur Systèmes', '2023-01-10');

INSERT INTO scolarite_staff (id_scolarite, service, poste) VALUES 
('66666666-6666-6666-6666-666666666664', 'Service Informatique', 'Responsable IA');

-- =====================================================================
-- 4. CLUBS & DEMANDES CLUBS (16 rows)
-- =====================================================================
INSERT INTO club (id_club, nom, description, budget) VALUES 
('77777777-7777-7777-7777-777777777771', 'FC Barcelona Souss-Massa Penya', 'Suivi de la Liga, de l''UEFA Champions League et débats sur les élections du club.', 3000.00),
('77777777-7777-7777-7777-777777777772', 'Club Odoo & ERPNext', 'Ateliers pratiques sur la personnalisation d applications d entreprise.', 4500.00),
('77777777-7777-7777-7777-777777777773', 'Avifaune & Nature', 'Passionnés des oiseaux, soins, régimes (Fischer Lovebirds, etc.) et reproduction.', 1200.00);

INSERT INTO president_club (id_president, id_club, id_etudiant) VALUES 
('88888888-8888-8888-8888-888888888881', '77777777-7777-7777-7777-777777777772', '66666666-6666-6666-6666-666666666661'),
('88888888-8888-8888-8888-888888888882', '77777777-7777-7777-7777-777777777771', '66666666-6666-6666-6666-666666666662');

INSERT INTO demande_club (id_demande_club, id_club, id_president, type, objet, description, statut, budget_demande) VALUES 
('99999999-9999-9999-9999-999999999991', '77777777-7777-7777-7777-777777777772', '88888888-8888-8888-8888-888888888881', 'Evenement', 'Hackathon Odoo Course Management', 'Développement en équipe d un module de gestion de cours avec droits d accès.', 'Approuvee', 800.00),
('99999999-9999-9999-9999-999999999992', '77777777-7777-7777-7777-777777777771', '88888888-8888-8888-8888-888888888882', 'Salle', 'Diffusion Finale Champions League', 'Demande d amphithéâtre pour le match final.', 'Soumise', 0.00),
('99999999-9999-9999-9999-999999999993', '77777777-7777-7777-7777-777777777772', '88888888-8888-8888-8888-888888888881', 'Budget', 'Licences Streamlit Cloud', 'Hébergement de l application Customer Segmentation Explorer.', 'En_Revue', 250.00);

-- =====================================================================
-- 5. WORKFLOWS, DEMANDES & DOCUMENTS (20 rows)
-- =====================================================================
INSERT INTO workflow (id_workflow, nom, statut) VALUES 
('AAAA1111-1111-1111-1111-111111111111', 'Validation Stage Technique', 'Actif');

INSERT INTO type_demande (id_type, libelle, code, id_workflow) VALUES 
('AAAA2222-2222-2222-2222-222222222221', 'Convention de Stage - Automatisation/CRM', 'STG_CRM_AUTO', 'AAAA1111-1111-1111-1111-111111111111');

INSERT INTO etape_workflow (id_etape, id_workflow, ordre, nom, statut) VALUES 
('AAAA3333-3333-3333-3333-333333333331', 'AAAA1111-1111-1111-1111-111111111111', 1, 'Vérification de la lettre de motivation (LaTeX)', 'Validee'),
('AAAA3333-3333-3333-3333-333333333332', 'AAAA1111-1111-1111-1111-111111111111', 2, 'Validation Sujet CRM', 'En_Cours');

INSERT INTO demande (id_demande, numero, id_etudiant, id_type, id_workflow, objet, statut, priorite) VALUES 
('AAAA4444-4444-4444-4444-444444444441', 'REQ-STG-009', '66666666-6666-6666-6666-666666666661', 'AAAA2222-2222-2222-2222-222222222221', 'AAAA1111-1111-1111-1111-111111111111', 'Demande stage ingénieur CRM', 'En_Traitement', 'Haute'),
('AAAA4444-4444-4444-4444-444444444442', 'REQ-STG-010', '66666666-6666-6666-6666-666666666662', 'AAAA2222-2222-2222-2222-222222222221', 'AAAA1111-1111-1111-1111-111111111111', 'Demande stage ERPNext', 'Soumise', 'Normale');

INSERT INTO document_officiel (id_document_officiel, id_demande, id_etudiant, nom, categorie, contenu, taille) VALUES 
('AAAA5555-5555-5555-5555-555555555551', 'AAAA4444-4444-4444-4444-444444444441', '66666666-6666-6666-6666-666666666661', 'Cover_Letter_CRM_IlyasHrizi.pdf', 'Lettre Motivation', decode('deadbeef', 'hex'), 25048);

-- =====================================================================
-- 6. CERTIFICATS MÉDICAUX & VÉRIFICATIONS (12 rows)
-- =====================================================================
INSERT INTO certificat_medical (id_certificat, id_etudiant, date_debut, date_fin, motif, statut, fichier, fichier_nom) VALUES 
('BBBB1111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666662', '2026-05-10', '2026-05-12', 'Grippe', 'Valide', decode('00', 'hex'), 'certif_medical_mehdi.jpg'),
('BBBB1111-1111-1111-1111-111111111112', '66666666-6666-6666-6666-666666666663', '2026-06-01', '2026-06-15', 'Intervention chirurgicale', 'En_Attente', decode('00', 'hex'), 'hopital_rapport.pdf');

-- =====================================================================
-- 7. CONVERSATIONS & MESSAGERIE (18 rows)
-- =====================================================================
INSERT INTO conversation (id_conversation, id_etudiant, sujet, statut) VALUES 
('CCCC1111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666661', 'Projet Android Event Manager (Java)', 'Ouverte'),
('CCCC1111-1111-1111-1111-111111111112', '66666666-6666-6666-6666-666666666661', 'Erreurs de commit Git', 'Fermee');

INSERT INTO conversation_participant (id_conversation, id_utilisateur) VALUES 
('CCCC1111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666661'),
('CCCC1111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666662'),
('CCCC1111-1111-1111-1111-111111111112', '66666666-6666-6666-6666-666666666661');

INSERT INTO message (id_message, id_conversation, id_expediteur, contenu, lu) VALUES 
('CCCC2222-2222-2222-2222-222222222221', 'CCCC1111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666661', 'Salut Mehdi, as-tu réussi à debugger le ListAdapter pour l appli Android ?', true),
('CCCC2222-2222-2222-2222-222222222222', 'CCCC1111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666662', 'Oui, j ai ajouté la persistence avec la base de données Room. Je push ça sur GitHub.', false),
('CCCC2222-2222-2222-2222-222222222223', 'CCCC1111-1111-1111-1111-111111111112', '66666666-6666-6666-6666-666666666661', 'Problème de branche résolu avec un rebase.', true);

-- =====================================================================
-- 8. ASSISTANT IA & BASE DE CONNAISSANCES (15 rows)
-- =====================================================================
INSERT INTO base_connaissance (id_base, titre, contenu, categorie) VALUES 
('DDDD1111-1111-1111-1111-111111111111', 'Documentation Odoo', 'Procédure pour configurer les modèles et les règles de sécurité dans un module ERP Odoo.', 'Technique'),
('DDDD1111-1111-1111-1111-111111111112', 'Guide Étudiant - Vie de Campus', 'Informations sur les clubs, l alimentation des animaux de compagnie sur le campus.', 'Vie Etudiante');

INSERT INTO conversation_ia (id_conversation_ia, id_etudiant, statut, satisfaction) VALUES 
('DDDD2222-2222-2222-2222-222222222221', '66666666-6666-6666-6666-666666666661', 'Active', NULL),
('DDDD2222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666661', 'Cloturee', 5);

INSERT INTO message_ia (id_message_ia, id_conversation_ia, role, contenu) VALUES 
('DDDD3333-3333-3333-3333-333333333331', 'DDDD2222-2222-2222-2222-222222222221', 'User', 'Comment puis-je formater un rapport de projet Streamlit et Scikit-learn pour la soutenance ?'),
('DDDD3333-3333-3333-3333-333333333332', 'DDDD2222-2222-2222-2222-222222222221', 'Assistant', 'Pour un rapport d application Customer Segmentation Explorer, incluez vos graphiques K-means générés par Streamlit et expliquez vos clusters...'),
('DDDD3333-3333-3333-3333-333333333333', 'DDDD2222-2222-2222-2222-222222222222', 'User', 'Quels fruits sont sûrs pour mon Fischer''s lovebird et à quel âge puis-je le reproduire ?'),
('DDDD3333-3333-3333-3333-333333333334', 'DDDD2222-2222-2222-2222-222222222222', 'Assistant', 'Les pommes (sans pépins), bananes et baies sont sûres. Évitez les cacahuètes crues. La reproduction est conseillée après 1 an.');

-- =====================================================================
-- 9. SALLES, SESSIONS & RÉSERVATIONS (40+ rows)
-- =====================================================================
INSERT INTO salle (id_salle, numero, nom, capacite, type, statut) VALUES 
('EEEE1111-1111-1111-1111-111111111111', 'LAB_DEV_02', 'Labo Ingénierie Logicielle', 25, 'Laboratoire', 'Disponible'),
('EEEE1111-1111-1111-1111-111111111112', 'REU_CLUB', 'Salle de Réunion Etudiants', 15, 'Salle_Reunion', 'Occupee');

INSERT INTO reservation_salle (id_reservation, id_salle, id_demandeur, date, heure_debut, heure_fin, motif, statut) VALUES 
('EEEE2222-2222-2222-2222-222222222221', 'EEEE1111-1111-1111-1111-111111111112', '66666666-6666-6666-6666-666666666661', '2026-12-05', '14:00:00', '16:00:00', 'Réunion architecture ERPNext pour module académique', 'Approuvee'),
('EEEE2222-2222-2222-2222-222222222222', 'EEEE1111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666661', '2026-12-10', '10:00:00', '12:00:00', 'Session test de l application Android en Java', 'Demandee');

-- =====================================================================
-- 10. NOTIFICATIONS, ALERTES & AUDIT LOGS
-- =====================================================================
INSERT INTO alerte_ia (id_alerte, id_salle, type, description, priorite) VALUES 
('FFFF1111-1111-1111-1111-111111111111', 'EEEE1111-1111-1111-1111-111111111112', 'Conflit_Planning', 'Conflit détecté entre réunion ERP et session Java', 'Haute'),
('FFFF1111-1111-1111-1111-111111111112', 'EEEE1111-1111-1111-1111-111111111111', 'Anomalie', 'Matériel de projection hors ligne', 'Normale');

-- Notifications
INSERT INTO notification (id_notification, id_utilisateur, titre, message, type, priorite) VALUES 
('FFFF2222-2222-2222-2222-222222222221', '66666666-6666-6666-6666-666666666661', 'Candidature Stage CRM', 'Votre candidature technique pour le stage CRM a été transmise au jury.', 'Demande', 'Info'),
('FFFF2222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666661', 'FC Barcelona Club', 'Rappel : Élections présidentielles du club de supporters ce vendredi.', 'Info', 'Info'),
('FFFF2222-2222-2222-2222-222222222223', '66666666-6666-6666-6666-666666666662', 'Nouvelle Demande de Club', 'Ilyas a soumis un budget de 250 DH pour Streamlit Cloud.', 'Systeme', 'Warning');

-- Audit Logs
INSERT INTO audit_log (action, module, entite, entite_id, id_utilisateur) VALUES 
('UPDATE_STATUS', 'Workflow', 'Demande', 'AAAA4444-4444-4444-4444-444444444441', '66666666-6666-6666-6666-666666666664'),
('CREATE_DOCUMENT', 'Scolarite', 'DocumentOfficiel', 'AAAA5555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666661'),
('START_CONVERSATION', 'IA_Assistant', 'ConversationIA', 'DDDD2222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666661');



-- =====================================================================
-- 1. MODULE SCOLARITÉ & ENSEIGNANTS (Professeurs & Staff)
-- =====================================================================
-- Ajout de profs et staff scolarité supplémentaires
INSERT INTO utilisateur (id_utilisateur, id_role, nom, prenom, email, mot_de_passe, actif) VALUES 
('10101010-1010-1010-1010-101010101001', '33333333-0000-0000-0000-000000000002', 'Zohra', 'Fatima', 'f.zohra@univ.ma', 'pass123', true),
('10101010-1010-1010-1010-101010101002', '33333333-0000-0000-0000-000000000002', 'Bennouna', 'Karim', 'k.bennouna@univ.ma', 'pass123', true),
('10101010-1010-1010-1010-101010101003', '33333333-0000-0000-0000-000000000003', 'Amraoui', 'Nabila', 'n.amraoui@univ.ma', 'pass123', true);

INSERT INTO employe (id_employe, matricule, fonction, departement, date_embauche, statut) VALUES 
('10101010-1010-1010-1010-101010101001', 'EMP-PROF-01', 'Professeur Habilité', 'Génie Informatique', '2014-09-01', 'Actif'),
('10101010-1010-1010-1010-101010101002', 'EMP-PROF-02', 'Professeur Assistant', 'Systèmes d Information', '2020-01-15', 'Actif'),
('10101010-1010-1010-1010-101010101003', 'EMP-SCOL-02', 'Agent de Scolarité', 'Affaires Étudiantines', '2019-06-01', 'Actif');

INSERT INTO professeur (id_professeur, specialite, grade_academique, heures_hebdomadaires) VALUES 
('10101010-1010-1010-1010-101010101001', 'Bases de Données & ERP', 'Professeur de Enseignement Supérieur', 10),
('10101010-1010-1010-1010-101010101002', 'Gouvernance SI & Odoo', 'Docteur Ingénieur', 14);

INSERT INTO scolarite_staff (id_scolarite, service, poste, bureau) VALUES 
('10101010-1010-1010-1010-101010101003', 'Scolarité Centrale', 'Gestionnaire des Notes et Absences', 'Bureau B-12');

-- Demandes de vérification d'examen et examens médicaux gérés par la scolarité
INSERT INTO verification_examen (id_verification, id_etudiant, id_professeur, id_transmis_par, motif, statut, salle_planification) VALUES 
('20202020-2020-2020-2020-202020202001', '77777777-0000-0000-0000-000000000001', '10101010-1010-1010-1010-101010101001', '10101010-1010-1010-1010-101010101003', 'Vérification de copie - Examen Base de Données', 'Planifiee', 'LAB_01'),
('20202020-2020-2020-2020-202020202002', '77777777-0000-0000-0000-000000000002', '10101010-1010-1010-1010-101010101002', '10101010-1010-1010-1010-101010101003', 'Contestation note de module Odoo', 'Demandee', NULL);

-- =====================================================================
-- 2. MODULE CLUBS & ÉVÉNEMENTS
-- =====================================================================
INSERT INTO club (id_club, nom, description, date_creation, statut, budget) VALUES 
('30303030-3030-3030-3030-303030303001', 'Club Robotique & IoT', 'Conception de systèmes embarqués et automatisation', '2023-11-10', 'Actif', 5000.00),
('30303030-3030-3030-3030-303030303002', 'Club Arts & Culture Souss', 'Valorisation du patrimoine culturel régional', '2022-03-15', 'Actif', 2500.00);

INSERT INTO president_club (id_president, id_club, id_etudiant, statut) VALUES 
('40404040-4040-4040-4040-404040404001', '30303030-3030-3030-3030-303030303001', '77777777-0000-0000-0000-000000000003', 'Actif'),
('40404040-4040-4040-4040-404040404002', '30303030-3030-3030-3030-303030303002', '77777777-0000-0000-0000-000000000004', 'Actif');

INSERT INTO demande_club (id_demande_club, id_club, id_president, type, objet, description, statut, budget_demande) VALUES 
('50505050-5050-5050-5050-505050505001', '30303030-3030-3030-3030-303030303001', '40404040-4040-4040-4040-404040404001', 'Materiel', 'Achat kits Arduino et capteurs IoT', 'Matériel pour la compétition nationale de robotique', 'Approuvee', 1800.00),
('50505050-5050-5050-5050-505050505002', '30303030-3030-3030-3030-303030303002', '40404040-4040-4040-4040-404040404002', 'Communication', 'Affiches et flyers festival culturel', 'Campagne de sensibilisation intra-universitaire', 'Soumise', 400.00);

-- =====================================================================
-- 3. MODULE SMART CAMPUS (Salles, Sessions, Présences & IoT/Alertes IA)
-- =====================================================================
INSERT INTO salle (id_salle, numero, nom, capacite, type, equipements, localisation, statut) VALUES 
('60606060-6060-6060-6060-606060606001', 'LAB_IOT', 'Laboratoire Objets Connectés', 40, 'Laboratoire', '{"projector": true, "sensors": "RFID", "benches": 20}', 'Bloc Technique', 'Disponible'),
('60606060-6060-6060-6060-606060606002', 'AMP_CENTRAL', 'Grand Amphithéâtre Ibn Khaldoun', 300, 'Amphitheatre', '{"projector": true, "mic": true, "ac": true}', 'Bloc Administratif', 'Disponible');

INSERT INTO session_salle (id_session, id_salle, id_cours, id_professeur, date, heure_debut, heure_fin, statut, nombre_etudiants) VALUES 
('70707070-7070-7070-7070-707070707001', '60606060-6060-6060-6060-606060606001', '66666666-0000-0000-0000-000000000001', '10101010-1010-1010-1010-101010101002', '2026-11-02', '09:00:00', '12:00:00', 'Planifiee', 28),
('70707070-7070-7070-7070-707070707002', '60606060-6060-6060-6060-606060606002', '66666666-0000-0000-0000-000000000002', '10101010-1010-1010-1010-101010101001', '2026-11-03', '14:00:00', '17:00:00', 'Planifiee', 150);

-- Génération de 150 entrées de présences automatisées pour tester le module Smart Campus
DO $$
DECLARE 
    i INT;
    uuid_val UUID;
BEGIN
    FOR i IN 1..150 LOOP
        uuid_val := gen_random_uuid();
        INSERT INTO presence_etudiant (id_presence, id_session, id_etudiant, heure_arrivee, statut, methode_identification)
        VALUES (
            uuid_val, 
            '70707070-7070-7070-7070-707070707001', 
            '77777777-0000-0000-0000-000000000001', 
            '09:02:00', 
            (CASE WHEN i % 5 = 0 THEN 'Retard' WHEN i % 10 = 0 THEN 'Absent' ELSE 'Present' END)::enum_statut_presence,
            'RFID'::enum_methode_identification
        )
        ON CONFLICT (id_session, id_etudiant) DO NOTHING;
    END LOOP;
END $$;

INSERT INTO alerte_ia (id_alerte, id_salle, type, description, statut, priorite) VALUES 
('80808080-8080-8080-8080-808080808001', '60606060-6060-6060-6060-606060606002', 'Surcharge', 'Affluence anormale détectée dans l amphi central (dépassement 90% capacité)', 'Nouvelle', 'Haute'),
('80808080-8080-8080-8080-808080808002', '60606060-6060-6060-6060-606060606001', 'Salle_Fantome', 'Salle réservée mais inoccupée pendant plus de 45 minutes', 'Resolue', 'Normale');

-- =====================================================================
-- 4. MODULE RESSOURCES HUMAINES (RH)
-- =====================================================================
INSERT INTO utilisateur (id_utilisateur, id_role, nom, prenom, email, mot_de_passe, actif) VALUES 
('90909090-9090-9090-9090-909090909001', '33333333-0000-0000-0000-000000000004', 'Tlemçani', 'Rachid', 'r.tlemcani@univ.ma', 'pass123', true);

INSERT INTO employe (id_employe, matricule, fonction, departement, date_embauche, statut) VALUES 
('90909090-9090-9090-9090-909090909001', 'EMP-RH-02', 'Gestionnaire Carrières & Paie', 'Ressources Humaines', '2016-03-01', 'Actif');

INSERT INTO rh_responsable (id_rh, service, poste, niveau_autorite, bureau) VALUES 
('90909090-9090-9090-9090-909090909001', 'Gestion du Personnel', 'Responsable Paie et Congés', 2, 'Bureau RH-04');

-- Demandes RH (Congés, Attestations, Heures sup)
INSERT INTO demande_rh (id_demande_rh, id_employe, id_traite_par, type, statut, date_debut, date_fin, duree, motif) VALUES 
('A1A1A1A1-A1A1-A1A1-A1A1-A1A1A1A1A101', '10101010-1010-1010-1010-101010101001', '90909090-9090-9090-9090-909090909001', 'Conge_Normal', 'Validee', '2026-07-01', '2026-07-15', 15, 'Congé annuel estival'),
('A1A1A1A1-A1A1-A1A1-A1A1-A1A1A1A1A102', '10101010-1010-1010-1010-101010101002', '90909090-9090-9090-9090-909090909001', 'Attestation_Travail', 'Soumise', NULL, NULL, NULL, 'Demande d attestation de travail administrative');





-- S'assurer qu'un rôle Professeur existe
INSERT INTO "role" (id_role, nom_role, description) 
VALUES ('b0000000-0000-0000-0000-000000000001', 'Professeur', 'Rôle enseignant')
ON CONFLICT (nom_role) DO NOTHING;

-- Insertion des professeurs (Prénom aléatoire + Nom du PDF)
-- 1. AFERHANE
INSERT INTO "utilisateur" (id_utilisateur, id_role, nom, prenom, email) 
VALUES ('a1111111-1111-1111-1111-111111111101', '33333333-0000-0000-0000-000000000002', 'AFERHANE', 'Karim', 'karim.aferhane@smartcampus.ma');
INSERT INTO "employe" (id_employe, matricule, fonction, departement, date_embauche, statut) 
VALUES ('a1111111-1111-1111-1111-111111111101', 'PROF_01', 'Enseignant-Chercheur', 'Informatique', '2022-09-01', 'Actif');
INSERT INTO "professeur" (id_professeur, specialite, grade_academique) 
VALUES ('a1111111-1111-1111-1111-111111111101', 'Informatique et SI', 'Professeur');

-- 2. AZIZI
INSERT INTO "utilisateur" (id_utilisateur, id_role, nom, prenom, email) 
VALUES ('a1111111-1111-1111-1111-111111111102', '33333333-0000-0000-0000-000000000002', 'AZIZI', 'Youssef', 'youssef.azizi@smartcampus.ma');
INSERT INTO "employe" (id_employe, matricule, fonction, departement, date_embauche, statut) 
VALUES ('a1111111-1111-1111-1111-111111111102', 'PROF_02', 'Enseignant-Chercheur', 'Informatique', '2022-09-01', 'Actif');
INSERT INTO "professeur" (id_professeur, specialite, grade_academique) 
VALUES ('a1111111-1111-1111-1111-111111111102', 'Sécurité des SI', 'Professeur');

-- 3. BAQACH
INSERT INTO "utilisateur" (id_utilisateur, id_role, nom, prenom, email) 
VALUES ('a1111111-1111-1111-1111-111111111103', '33333333-0000-0000-0000-000000000002', 'BAQACH', 'Rachid', 'rachid.baqach@smartcampus.ma');
INSERT INTO "employe" (id_employe, matricule, fonction, departement, date_embauche, statut) 
VALUES ('a1111111-1111-1111-1111-111111111103', 'PROF_03', 'Enseignant-Chercheur', 'Informatique', '2022-09-01', 'Actif');
INSERT INTO "professeur" (id_professeur, specialite, grade_academique) 
VALUES ('a1111111-1111-1111-1111-111111111103', 'Développement Mobile', 'Professeur');

-- 4. HIKAL
INSERT INTO "utilisateur" (id_utilisateur, id_role, nom, prenom, email) 
VALUES ('a1111111-1111-1111-1111-111111111104', '33333333-0000-0000-0000-000000000002', 'HIKAL', 'Fatima', 'fatima.hikal@smartcampus.ma');
INSERT INTO "employe" (id_employe, matricule, fonction, departement, date_embauche, statut) 
VALUES ('a1111111-1111-1111-1111-111111111104', 'PROF_04', 'Enseignant-Chercheur', 'Langues', '2022-09-01', 'Actif');
INSERT INTO "professeur" (id_professeur, specialite, grade_academique) 
VALUES ('a1111111-1111-1111-1111-111111111104', 'Langue Anglaise', 'Professeur');

-- 5. BOUYISS
INSERT INTO "utilisateur" (id_utilisateur, id_role, nom, prenom, email) 
VALUES ('a1111111-1111-1111-1111-111111111105', '33333333-0000-0000-0000-000000000002', 'BOUYISS', 'Mehdi', 'mehdi.bouyiss@smartcampus.ma');
INSERT INTO "employe" (id_employe, matricule, fonction, departement, date_embauche, statut) 
VALUES ('a1111111-1111-1111-1111-111111111105', 'PROF_05', 'Enseignant-Chercheur', 'Droit', '2022-09-01', 'Actif');
INSERT INTO "professeur" (id_professeur, specialite, grade_academique) 
VALUES ('a1111111-1111-1111-1111-111111111105', 'Droit Numérique', 'Professeur');

-- 6. EL ATTAOUI
INSERT INTO "utilisateur" (id_utilisateur, id_role, nom, prenom, email) 
VALUES ('a1111111-1111-1111-1111-111111111106', '33333333-0000-0000-0000-000000000002', 'EL ATTAOUI', 'Amine', 'amine.elattaoui@smartcampus.ma');
INSERT INTO "employe" (id_employe, matricule, fonction, departement, date_embauche, statut) 
VALUES ('a1111111-1111-1111-1111-111111111106', 'PROF_06', 'Enseignant-Chercheur', 'Informatique', '2022-09-01', 'Actif');
INSERT INTO "professeur" (id_professeur, specialite, grade_academique) 
VALUES ('a1111111-1111-1111-1111-111111111106', 'Systèmes Décisionnels', 'Professeur');

-- 7. EL OUARDI
INSERT INTO "utilisateur" (id_utilisateur, id_role, nom, prenom, email) 
VALUES ('a1111111-1111-1111-1111-111111111107', '33333333-0000-0000-0000-000000000002', 'EL OUARDI', 'Salma', 'salma.elouardi@smartcampus.ma');
INSERT INTO "employe" (id_employe, matricule, fonction, departement, date_embauche, statut) 
VALUES ('a1111111-1111-1111-1111-111111111107', 'PROF_07', 'Enseignant-Chercheur', 'Langues', '2022-09-01', 'Actif');
INSERT INTO "professeur" (id_professeur, specialite, grade_academique) 
VALUES ('a1111111-1111-1111-1111-111111111107', 'Langue Française', 'Professeur');

-- 8. MOUDOUDI
INSERT INTO "utilisateur" (id_utilisateur, id_role, nom, prenom, email) 
VALUES ('a1111111-1111-1111-1111-111111111108', '33333333-0000-0000-0000-000000000002', 'MOUDOUDI', 'Hassan', 'hassan.moudoudi@smartcampus.ma');
INSERT INTO "employe" (id_employe, matricule, fonction, departement, date_embauche, statut) 
VALUES ('a1111111-1111-1111-1111-111111111108', 'PROF_08', 'Enseignant-Chercheur', 'Réseaux & IoT', '2022-09-01', 'Actif');
INSERT INTO "professeur" (id_professeur, specialite, grade_academique) 
VALUES ('a1111111-1111-1111-1111-111111111108', 'IoT et Systèmes Embarqués', 'Professeur');

-- 9. AGALIT
INSERT INTO "utilisateur" (id_utilisateur, id_role, nom, prenom, email) 
VALUES ('a1111111-1111-1111-1111-111111111109', '33333333-0000-0000-0000-000000000002', 'AGALIT', 'Moad', 'moad.agalit@smartcampus.ma');
INSERT INTO "employe" (id_employe, matricule, fonction, departement, date_embauche, statut) 
VALUES ('a1111111-1111-1111-1111-111111111109', 'PROF_09', 'Enseignant-Chercheur', 'Cloud', '2022-09-01', 'Actif');
INSERT INTO "professeur" (id_professeur, specialite, grade_academique) 
VALUES ('a1111111-1111-1111-1111-111111111109', 'Cloud Computing', 'Professeur');


INSERT INTO "salle" (id_salle, numero, nom, capacite, type, statut) VALUES
('22222222-2222-2222-2222-222222222201', 'S1', 'Salle 1', 30, 'Laboratoire', 'Disponible'),
('22222222-2222-2222-2222-222222222202', 'S3', 'Salle 3', 30, 'Laboratoire', 'Disponible'),
('22222222-2222-2222-2222-222222222203', 'S5', 'Salle 5', 30, 'Laboratoire', 'Disponible'),
('22222222-2222-2222-2222-222222222204', 'S9', 'Salle 9', 50, 'Salle_Cours', 'Disponible'),
('22222222-2222-2222-2222-222222222205', 'AMPHI1', 'Amphi 1', 200, 'Amphitheatre', 'Disponible'),
('22222222-2222-2222-2222-222222222206', 'AMPHI3', 'Amphi 3', 200, 'Amphitheatre', 'Disponible'),
('22222222-2222-2222-2222-222222222207', 'ESP_ROBO', 'Espace robotique', 40, 'Laboratoire', 'Disponible');


INSERT INTO "cours" (id_cours, code, nom, credits, coefficient) VALUES
('c3333333-3333-3333-3333-333333333301', 'M247', 'Gouvernance et Urbanisation des SI', 4, 2),
('c3333333-3333-3333-3333-333333333302', 'M246', 'Développement mobile', 4, 2),
('c3333333-3333-3333-3333-333333333303', 'M241', 'Sécurité des SI', 4, 2),
('c3333333-3333-3333-3333-333333333304', 'M245', 'Systèmes décisionnels', 4, 2),
('c3333333-3333-3333-3333-333333333305', 'M244_2', 'Langue Anglaise', 2, 1),
('c3333333-3333-3333-3333-333333333306', 'M244_FR', 'Langue Française', 2, 1),
('c3333333-3333-3333-3333-333333333307', 'M242', 'IoT et Cloud computing', 6, 3),
('c3333333-3333-3333-3333-333333333308', 'M243', 'Droit numérique et droits de propriété intellectuelle IT', 2, 1);

-- 1. Insérer les rôles
INSERT INTO "role" ("id_role", "nom_role", "description", "created_at", "updated_at")
VALUES
  ('85a81db1-2a90-4c7b-b38c-85a210dc01b7', 'SuperAdmin', 'Administrateur système avec accès total', NOW(), NOW()),
  ('d83e29f4-1875-4309-8472-35105221dc2a', 'ScolariteStaff', 'Personnel de la scolarité', NOW(), NOW()),
  ('4f8c9b2d-6e1a-4d3b-9a0f-5c7e8d1a2b3c', 'Professeur', 'Corps enseignant', NOW(), NOW()),
  ('b7a1d5c2-3e4f-4a6b-8c9d-0e1f2a3b4c5d', 'Etudiant', 'Étudiant de l''établissement', NOW(), NOW()),
  ('e9c4b2a1-d5f6-4e7b-9a8c-7d6e5f4a3b2c', 'RH', 'Responsable des ressources humaines', NOW(), NOW())
ON CONFLICT ("nom_role") DO NOTHING;

-- 2. Insérer les permissions
INSERT INTO "permission" ("id_permission", "nom", "module", "description")
VALUES
  ('c3d2e1f0-a4b5-4c6d-8e7f-9a0b1c2d3e4f', 'MANAGE_USERS', 'AUTH', 'Créer, modifier, supprimer des utilisateurs'),
  ('1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d', 'MANAGE_ROLES', 'RBAC', 'Gérer les rôles et permissions'),
  ('f5d4c3b2-a1e0-4f9d-8c7b-6a5b4c3d2e1f', 'VIEW_DASHBOARD', 'CORE', 'Accéder au tableau de bord principal'),
  ('7c9e6679-7425-40de-944b-e07fc1f90ae7', 'MANAGE_DEMANDES', 'SCOLARITE', 'Gérer les demandes étudiantes')
ON CONFLICT ("nom", "module") DO NOTHING;

-- 3. Attribuer les permissions au rôle SuperAdmin
INSERT INTO "role_permission" ("id_role", "id_permission")
VALUES
  ('85a81db1-2a90-4c7b-b38c-85a210dc01b7', 'c3d2e1f0-a4b5-4c6d-8e7f-9a0b1c2d3e4f'),
  ('85a81db1-2a90-4c7b-b38c-85a210dc01b7', '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d'),
  ('85a81db1-2a90-4c7b-b38c-85a210dc01b7', 'f5d4c3b2-a1e0-4f9d-8c7b-6a5b4c3d2e1f'),
  ('85a81db1-2a90-4c7b-b38c-85a210dc01b7', '7c9e6679-7425-40de-944b-e07fc1f90ae7')
ON CONFLICT ("id_role", "id_permission") DO NOTHING;

-- 4. Créer l'utilisateur SuperAdmin
INSERT INTO "utilisateur" (
  "id_utilisateur", 
  "id_role", 
  "nom", 
  "prenom", 
  "email", 
  "mot_de_passe",
  "actif", 
  "date_creation", 
  "updated_at",
  "notif_email", 
  "notif_demandes", 
  "notif_documents", 
  "notif_calendrier"
)
VALUES (
  '3b8d4f21-9e7a-4c5b-8d1e-2f3a4b5c6d7e',
  '85a81db1-2a90-4c7b-b38c-85a210dc01b7', 
  'Admin',
  'Super',
  'superadmin@test.com',
  '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGGa.PQC', 
  true, 
  NOW(), 
  NOW(),
  true, 
  true, 
  true, 
  false
)
ON CONFLICT ("email") DO NOTHING;

UPDATE "utilisateur"
SET "mot_de_passe" = '$2b$10$X7vW0cK5J3e2M6s8Q1v9g.Pq8K2X7vW0cK5J3e2M6s8Q1v9g.Pq'
WHERE "email" = 'superadmin@test.com';
DELETE FROM "utilisateur" WHERE "email" = 'superadmin@test.com';


INSERT INTO "utilisateur" (
  "id_utilisateur", "id_role", "nom", "prenom", "email", "mot_de_passe", 
  "actif", "date_creation", "updated_at", "notif_email", "notif_demandes", "notif_documents", "notif_calendrier"
) 
VALUES (
  gen_random_uuid(), 
  '85a81db1-2a90-4c7b-b38c-85a210dc01b7', 
  'Admin', 'Super', 'admin@smartcampus.ma', '$2b$10$00LW1yfNbXaJu2qm/3YOT.S1sPy8udu7hzL6ZPuk8X7h3B3/P4nEm', 
  true, NOW(), NOW(), true, true, true, false
) 
ON CONFLICT ("email") DO UPDATE 
SET "mot_de_passe" = '$2b$10$00LW1yfNbXaJu2qm/3YOT.S1sPy8udu7hzL6ZPuk8X7h3B3/P4nEm', "id_role" = '85a81db1-2a90-4c7b-b38c-85a210dc01b7';

INSERT INTO "role" (id_role, nom_role, description) 
VALUES ('44444444-0000-0000-0000-000000000001', 'SUPER_ADMIN', 'Administrateur système complet')
ON CONFLICT (nom_role) DO NOTHING;

UPDATE "utilisateur" 
SET email = 'hriziilyass@gmail.com'
WHERE id_utilisateur = '77777777-0000-0000-0000-000000000002';

-- 1. Insérer les Workflows
INSERT INTO workflow (id_workflow, nom, description, statut) VALUES
('88888888-8888-8888-8888-888888888881', 'Workflow Conventions', 'Gestion des conventions de stage et PFE', 'Actif'),
('88888888-8888-8888-8888-888888888882', 'Workflow Scolarité', 'Demandes de documents de scolarité classiques', 'Actif'),
('88888888-8888-8888-8888-888888888883', 'Workflow Absences', 'Gestion des absences et justifications', 'Actif'),
('88888888-8888-8888-8888-888888888884', 'Workflow Cartes', 'Renouvellement et création de cartes', 'Actif'),
('88888888-8888-8888-8888-888888888885', 'Workflow Pédagogique', 'Demandes à caractère pédagogique', 'Actif'),
('88888888-8888-8888-8888-888888888886', 'Workflow Salles', 'Réservations et accès aux salles', 'Actif'),
('88888888-8888-8888-8888-888888888887', 'Workflow Documents Originaux', 'Retrait de documents originaux (Bac, etc.)', 'Actif');

-- 2. Insérer les Types de Demande
INSERT INTO type_demande (id_type, libelle, code, description, id_workflow, delai_traitement) VALUES
('77777777-7777-7777-7777-777777777771', 'Convention de stage', 'CONV-STG', 'Demande de convention', '88888888-8888-8888-8888-888888888881', 3),
('77777777-7777-7777-7777-777777777772', 'Attestation de stage', 'ATT-STG', 'Demande d''attestation de stage', '88888888-8888-8888-8888-888888888881', 2),
('77777777-7777-7777-7777-777777777773', 'Relevé de notes', 'REL-NOT', 'Demande de relevé', '88888888-8888-8888-8888-888888888882', 1),
('77777777-7777-7777-7777-777777777774', 'Attestation de scolarité', 'ATT-SCOL', 'Attestation de scolarité', '88888888-8888-8888-8888-888888888882', 1),
('77777777-7777-7777-7777-777777777775', 'Justificatif d''absence', 'JUST-ABS', 'Justifier une absence', '88888888-8888-8888-8888-888888888883', 2),
('77777777-7777-7777-7777-777777777776', 'Carte d''étudiant', 'CART-ETU', 'Renouvellement carte', '88888888-8888-8888-8888-888888888884', 5),
('77777777-7777-7777-7777-777777777777', 'Dérogation', 'DEROG', 'Demande exceptionnelle', '88888888-8888-8888-8888-888888888885', 7),
('77777777-7777-7777-7777-777777777778', 'Demande de salle', 'DEM-SAL', 'Réservation ponctuelle', '88888888-8888-8888-8888-888888888886', 1),
('77777777-7777-7777-7777-777777777779', 'Retrait provisoire', 'RET-PROV', 'Retrait du bac', '88888888-8888-8888-8888-888888888887', 2);

-- 3. Exécuter maintenant l'insertion des demandes que je vous avais fournie précédemment.
INSERT INTO demande (
    id_demande, 
    numero, 
    id_etudiant, 
    id_type, 
    id_workflow, 
    id_traite_par, 
    objet, 
    description, 
    statut, 
    priorite
) VALUES 
-- 1. Convention pour le projet de fin d'année
('a1111111-1111-1111-1111-111111111111', 'DEM-2026-0001', '66666666-6666-6666-6666-666666666661', '77777777-7777-7777-7777-777777777771', '88888888-8888-8888-8888-888888888881', NULL, 'Convention de stage PFA', 'Demande de convention pour le projet de plateforme de dématérialisation administrative.', 'Validee', 'Haute'),

-- 2. Stage d'été
('a2222222-2222-2222-2222-222222222222', 'DEM-2026-0002', '66666666-6666-6666-6666-666666666661', '77777777-7777-7777-7777-777777777772', '88888888-8888-8888-8888-888888888881', NULL, 'Attestation de stage d''été', 'Document nécessaire pour finaliser le dossier de stage d''été en ingénierie des systèmes d''information (spécialité CRM/Odoo).', 'Cloturee', 'Normale'),

-- 3. Relevé de notes
('a3333333-3333-3333-3333-333333333333', 'DEM-2026-0003', '66666666-6666-6666-6666-666666666661', '77777777-7777-7777-7777-777777777773', '88888888-8888-8888-8888-888888888882', NULL, 'Relevé de notes - S3', 'Besoin du relevé de notes officiel de la filière MGSI pour le dossier de candidature de stage.', 'Soumise', 'Urgente'),

-- 4. Convention PFE
('a4444444-4444-4444-4444-444444444444', 'DEM-2026-0004', '66666666-6666-6666-6666-666666666661', '77777777-7777-7777-7777-777777777771', '88888888-8888-8888-8888-888888888881', NULL, 'Convention de PFE - Oracle R&D', 'Signature de la convention suite à la réussite du test technique pour le stage de fin d''études au centre R&D.', 'En_Traitement', 'Haute'),

-- 5. Attestation de scolarité
('a5555555-5555-5555-5555-555555555555', 'DEM-2026-0005', '66666666-6666-6666-6666-666666666661', '77777777-7777-7777-7777-777777777774', '88888888-8888-8888-8888-888888888882', NULL, 'Attestation de scolarité - 2ème Année', 'Demande standard d''attestation pour l''année en cours.', 'Brouillon', 'Normale'),

-- 6. Justificatif d'absence
('a6666666-6666-6666-6666-666666666666', 'DEM-2026-0006', '66666666-6666-6666-6666-666666666661', '77777777-7777-7777-7777-777777777775', '88888888-8888-8888-8888-888888888883', NULL, 'Justification d''absence (Hackathon)', 'Absence justifiée lors du passage de l''évaluation pour l''événement Business Show Agadir.', 'Rejetee', 'Basse'),

-- 7. Carte d'étudiant
('a7777777-7777-7777-7777-777777777777', 'DEM-2026-0007', '66666666-6666-6666-6666-666666666661', '77777777-7777-7777-7777-777777777776', '88888888-8888-8888-8888-888888888884', NULL, 'Renouvellement carte d''étudiant', 'La puce RFID de la carte actuelle ne fonctionne plus aux portiques.', 'Soumise', 'Normale'),

-- 8. Demande de dérogation
('a8888888-8888-8888-8888-888888888888', 'DEM-2026-0008', '66666666-6666-6666-6666-666666666661', '77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888885', NULL, 'Dérogation pour module additionnel', 'Demande de validation d''un module optionnel orienté Python/Data Science (Clustering K-means).', 'En_Traitement', 'Normale'),

-- 9. Demande de salle (Club)
('a9999999-9999-9999-9999-999999999999', 'DEM-2026-0009', '66666666-6666-6666-6666-666666666661', '77777777-7777-7777-7777-777777777778', '88888888-8888-8888-8888-888888888886', NULL, 'Réservation amphithéâtre', 'Présentation du module de gestion de scolarité ERP/Odoo devant la promotion.', 'Validee', 'Haute'),

-- 10. Retrait provisoire
('a0000000-0000-0000-0000-000000000000', 'DEM-2026-0010', '66666666-6666-6666-6666-666666666661', '77777777-7777-7777-7777-777777777779', '88888888-8888-8888-8888-888888888887', NULL, 'Retrait provisoire du baccalauréat', 'Besoin de l''original du baccalauréat pour le renouvellement du passeport/CNIE.', 'Cloturee', 'Normale');

INSERT INTO demande (
    id_demande, 
    numero, 
    id_etudiant, 
    id_type, 
    id_workflow, 
    id_traite_par, 
    objet, 
    description, 
    statut, 
    priorite
) VALUES 
-- 11. Attestation de réussite (Certificate of Success)
('b1111111-1111-1111-1111-111111111111', 'DEM-2026-0011', '66666666-6666-6666-6666-666666666661', (SELECT id_type FROM type_demande LIMIT 1), (SELECT id_workflow FROM workflow LIMIT 1), NULL, 'Attestation de réussite', 'Demande d''attestation de réussite pour l''année universitaire précédente.', 'Soumise', 'Normale'),

-- 12. Attestation d'inscription (Enrollment Certificate)
('b2222222-2222-2222-2222-222222222222', 'DEM-2026-0012', '66666666-6666-6666-6666-666666666661', (SELECT id_type FROM type_demande LIMIT 1), (SELECT id_workflow FROM workflow LIMIT 1), NULL, 'Attestation d''inscription', 'Document requis pour le renouvellement du dossier d''assurance maladie et de bourse.', 'Soumise', 'Haute'),

-- 13. Attestation de bonne conduite (Certificate of Good Conduct)
('b3333333-3333-3333-3333-333333333333', 'DEM-2026-0013', '66666666-6666-6666-6666-666666666661', (SELECT id_type FROM type_demande LIMIT 1), (SELECT id_workflow FROM workflow LIMIT 1), NULL, 'Attestation de bonne conduite', 'Demande pour constitution d''un dossier administratif pour un stage à l''étranger.', 'Soumise', 'Normale'),

-- 14. Relevé de notes global (Global Transcripts)
('b4444444-4444-4444-4444-444444444444', 'DEM-2026-0014', '66666666-6666-6666-6666-666666666661', (SELECT id_type FROM type_demande LIMIT 1), (SELECT id_workflow FROM workflow LIMIT 1), NULL, 'Relevé de notes global', 'Demande de l''historique complet des relevés de notes certifiés depuis la 1ère année.', 'Soumise', 'Urgente'),

-- 15. Certificat de présence (Certificate of Attendance)
('b5555555-5555-5555-5555-555555555555', 'DEM-2026-0015', '66666666-6666-6666-6666-666666666661', (SELECT id_type FROM type_demande LIMIT 1), (SELECT id_workflow FROM workflow LIMIT 1), NULL, 'Certificat de présence aux examens', 'Justificatif officiel de présence requis pour l''employeur durant la période des examens finaux.', 'Soumise', 'Normale');












DO $$
DECLARE
  v_workflow_id UUID;
BEGIN
  -- 1. Récupérer un workflow existant ou en créer un minimaliste
  SELECT id_workflow INTO v_workflow_id FROM "workflow" LIMIT 1;

  IF v_workflow_id IS NULL THEN
    v_workflow_id := '99999999-9999-4000-8000-000000000001';
    INSERT INTO "workflow" ("id_workflow", "nom", "description")
    VALUES (
      v_workflow_id,
      'Workflow Demandes Standard',
      'Workflow générique pour le traitement des demandes administratives'
    );
  END IF;

  -- 2. Insertion / Mise à jour des types de demandes
  INSERT INTO "type_demande" ("id_type", "code", "libelle")
  VALUES 
    ('11111111-aaaa-4000-8000-000000000001', 'ATTESTATION_SCOLARITE', 'Attestation de Scolarité'),
    ('11111111-aaaa-4000-8000-000000000002', 'RELEVE_NOTES', 'Relevé de Notes'),
    ('11111111-aaaa-4000-8000-000000000003', 'CONVENTION_STAGE', 'Convention de Stage'),
    ('11111111-aaaa-4000-8000-000000000004', 'AUTRE', 'Demande Administrative Libre')
  ON CONFLICT ("id_type") DO UPDATE 
  SET "code" = EXCLUDED."code", "libelle" = EXCLUDED."libelle";

  -- 3. Insertion du jeu de test complet
  INSERT INTO "demande" (
    "id_demande",
    "numero",
    "id_etudiant",
    "id_type",
    "id_workflow",
    "objet",
    "description",
    "statut",
    "date_creation"
  )
  VALUES 
    -- Cas 1 : Nouvelle demande d'attestation à valider et envoyer par e-mail
    (
      'a1b2c3d4-0001-4000-8000-111111111111',
      'DEM-2026-0101',
      '66666666-6666-6666-6666-666666666661',
      '11111111-aaaa-4000-8000-000000000001',
      v_workflow_id,
      'Demande d attestation de scolarité (Année en cours)',
      'J ai besoin de mon attestation de scolarité pour le renouvellement de mon dossier de bourse.',
      'Soumise',
      NOW() - INTERVAL '2 hours'
    ),

    -- Cas 2 : Relevé de notes en cours de traitement
    (
      'a1b2c3d4-0002-4000-8000-222222222222',
      'DEM-2026-0102',
      '66666666-6666-6666-6666-666666666661',
      '11111111-aaaa-4000-8000-000000000002',
      v_workflow_id,
      'Relevé de notes du Semestre 1',
      'Relevé nécessaire pour ma candidature à un programme d échange académique.',
      'En_Traitement',
      NOW() - INTERVAL '1 day'
    ),

    -- Cas 3 : Demande Validée prête à être servée / clôturée
    (
      'a1b2c3d4-0003-4000-8000-333333333333',
      'DEM-2026-0103',
      '66666666-6666-6666-6666-666666666661',
      '11111111-aaaa-4000-8000-000000000001',
      v_workflow_id,
      'Attestation de scolarité pour visa',
      'Document requis par le consulat pour mon dossier de visa étudiant.',
      'Validee',
      NOW() - INTERVAL '3 days'
    ),

    -- Cas 4 : Demande libre sans pièce officielle requise
    (
      'a1b2c3d4-0004-4000-8000-444444444444',
      'DEM-2026-0104',
      '66666666-6666-6666-6666-666666666661',
      '11111111-aaaa-4000-8000-000000000004',
      v_workflow_id,
      'Changement de groupe de TD (Section B vers A)',
      'Conflit d emploi du temps justifié par une attestation de transport.',
      'Soumise',
      NOW() - INTERVAL '4 hours'
    ),

    -- Cas 5 : Demande Servée & Clôturée (Historique)
    (
      'a1b2c3d4-0005-4000-8000-555555555555',
      'DEM-2026-0105',
      '66666666-6666-6666-6666-666666666661',
      '11111111-aaaa-4000-8000-000000000001',
      v_workflow_id,
      'Attestation d inscription annuelle',
      'Document récupéré en mains propres par l étudiant.',
      'Cloturee',
      NOW() - INTERVAL '10 days'
    ),

    -- Cas 6 : Demande Rejetée (Historique)
    (
      'a1b2c3d4-0006-4000-8000-666666666666',
      'DEM-2026-0106',
      '66666666-6666-6666-6666-666666666661',
      '11111111-aaaa-4000-8000-000000000002',
      v_workflow_id,
      'Relevé de notes global non officiel',
      'Rejeté : Les délibérations du semestre ne sont pas encore finalisées.',
      'Rejetee',
      NOW() - INTERVAL '15 days'
    ),

    -- Cas 7 : Brouillon
    (
      'a1b2c3d4-0007-4000-8000-777777777777',
      'DEM-2026-0107',
      '66666666-6666-6666-6666-666666666661',
      '11111111-aaaa-4000-8000-000000000004',
      v_workflow_id,
      'Demande de duplicata de carte d étudiant',
      'Brouillon en attente de la déclaration de perte.',
      'Brouillon',
      NOW() - INTERVAL '1 hour'
    )
  ON CONFLICT ("id_demande") DO NOTHING;

END $$;

INSERT INTO "notification" (
  "id_notification", 
  "id_utilisateur", 
  "titre", 
  "message", 
  "type", 
  "date_envoi", 
  "lu", 
  "priorite"
)
VALUES
-- 1. Notification standard non lue (Nouvelle Demande)
(
  gen_random_uuid(),
  (SELECT id_utilisateur FROM "utilisateur" WHERE email = 'admin@smartcampus.ma'),
  'Nouvelle demande reçue',
  'Une nouvelle demande d''attestation a été soumise par un étudiant et nécessite votre validation.',
  'Demande',
  NOW(),
  false,
  'Info'
),

-- 2. Alerte non lue (Conflit détecté par l'IA)
(
  gen_random_uuid(),
  (SELECT id_utilisateur FROM "utilisateur" WHERE email = 'admin@smartcampus.ma'),
  'Conflit de planification détecté',
  'L''IA a détecté une double réservation pour l''Amphithéâtre principal ce jeudi à 10h00.',
  'Alerte',
  NOW() - INTERVAL '1 hour',
  false,
  'Warning'
),

-- 3. Message Urgent non lu (Système)
(
  gen_random_uuid(),
  (SELECT id_utilisateur FROM "utilisateur" WHERE email = 'admin@smartcampus.ma'),
  'Maintenance système urgente',
  'Le serveur sera redémarré dans 30 minutes pour une mise à jour de sécurité critique.',
  'Systeme',
  NOW() - INTERVAL '5 minutes',
  false,
  'Urgent'
),

-- 4. Notification déjà lue (Succès Document)
(
  gen_random_uuid(),
  (SELECT id_utilisateur FROM "utilisateur" WHERE email = 'admin@smartcampus.ma'),
  'Document officiel généré',
  'Le relevé de notes a été généré et signé électroniquement avec succès.',
  'Document',
  NOW() - INTERVAL '1 day',
  true,
  'Info'
);







INSERT INTO role (id_role, nom_role)
VALUES (gen_random_uuid(), 'Employe')
ON CONFLICT DO NOTHING;
DO $$
DECLARE
    -- Génération d'un UUID unique pour l'employé
    nouvel_id UUID := gen_random_uuid();
    -- Variable pour stocker l'ID du rôle
    role_id UUID;
BEGIN
    -- 1. Récupérer l'ID du rôle "Employe" (Ajustez 'Employe' si votre rôle s'appelle autrement)
    SELECT id_role INTO role_id FROM role WHERE nom_role IN ('Employe', 'Employé', 'User') LIMIT 1;

    -- Si vous n'avez pas de rôle, on arrête le script
    IF role_id IS NULL THEN
        RAISE EXCEPTION 'Aucun rôle "Employe" trouvé dans la table role.';
    END IF;

    -- 2. Création de l'utilisateur
    INSERT INTO utilisateur (
        id_utilisateur, 
        id_role, 
        nom, 
        prenom, 
        email, 
        mot_de_passe, 
        telephone, 
        actif,
        notif_email,
        notif_demandes,
        notif_documents
    )
    VALUES (
        nouvel_id,
        role_id,
        'Testeur',          -- Nom
        'Email',            -- Prénom
        'ilyas4test@gmail.com',  -- 👈 METTEZ VOTRE VRAI EMAIL ICI
        '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjGsGZ0lY2', -- Hash bcrypt pour le mot de passe 'ChangeMe123!'
        '0600000000',
        true,
        true,
        true,
        true
    );

    -- 3. Création du profil Employé (lié au même ID)
    INSERT INTO employe (
        id_employe, 
        matricule, 
        fonction, 
        departement, 
        date_embauche, 
        statut, 
        grade
    )
    VALUES (
        nouvel_id,
        'EMP-TEST-001',
        'Ingénieur Test',
        'Développement',
        CURRENT_DATE,
        'Actif',
        'Cadre'
    );

    RAISE NOTICE 'Employé de test créé avec succès !';
END $$;












DO $$
DECLARE
    -- Variables pour récupérer les rôles
    v_role_prof UUID;
    v_role_etu UUID;
    
    -- UUIDs valides en hexadécimal (0-9, a-f)
    v_id_prof UUID := 'b0000000-0000-0000-0000-000000000001';
    v_id_etu1 UUID := 'e1000000-0000-0000-0000-000000000001';
    v_id_etu2 UUID := 'e1000000-0000-0000-0000-000000000002';
    
    v_id_fil1 UUID := 'f1000000-0000-0000-0000-000000000001';
    v_id_fil2 UUID := 'f1000000-0000-0000-0000-000000000002';
    
    v_id_cours1 UUID := 'c1000000-0000-0000-0000-000000000001';
    v_id_cours2 UUID := 'c1000000-0000-0000-0000-000000000002';
    
    v_id_salle UUID := 'a1000000-0000-0000-0000-000000000001';
BEGIN
    -- 1. Récupération ou Création des Rôles
    INSERT INTO role (id_role, nom_role) VALUES (gen_random_uuid(), 'Professeur') ON CONFLICT (nom_role) DO NOTHING;
    INSERT INTO role (id_role, nom_role) VALUES (gen_random_uuid(), 'Etudiant') ON CONFLICT (nom_role) DO NOTHING;

    SELECT id_role INTO v_role_prof FROM role WHERE nom_role = 'Professeur' LIMIT 1;
    SELECT id_role INTO v_role_etu FROM role WHERE nom_role = 'Etudiant' LIMIT 1;

    -- 2. Création de l'Enseignant
    INSERT INTO utilisateur (id_utilisateur, id_role, nom, prenom, email, mot_de_passe, actif)
    VALUES (v_id_prof, v_role_prof, 'Dubois', 'Jean', 'prof.test@smartcampus.ma', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjGsGZ0lY2', true)
    ON CONFLICT (email) DO NOTHING;

    INSERT INTO employe (id_employe, matricule, fonction, date_embauche, statut)
    VALUES (v_id_prof, 'PROF-TEST-01', 'Enseignant Chercheur', CURRENT_DATE, 'Actif'::enum_statut_employe)
    ON CONFLICT (matricule) DO NOTHING;

    INSERT INTO professeur (id_professeur, specialite, heures_hebdomadaires)
    VALUES (v_id_prof, 'Informatique & Base de Données', 14)
    ON CONFLICT DO NOTHING;

    -- 3. Création des Filières
    INSERT INTO filiere (id_filiere, nom, code) VALUES (v_id_fil1, 'Génie Informatique', 'GINF') ON CONFLICT DO NOTHING;
    INSERT INTO filiere (id_filiere, nom, code) VALUES (v_id_fil2, 'Génie Civil', 'GCIV') ON CONFLICT DO NOTHING;

    -- 4. Création de 2 Étudiants
    INSERT INTO utilisateur (id_utilisateur, id_role, nom, prenom, email, mot_de_passe, actif)
    VALUES (v_id_etu1, v_role_etu, 'Martin', 'Lucas', 'lucas.martin@smartcampus.ma', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjGsGZ0lY2', true) ON CONFLICT (email) DO NOTHING;
    INSERT INTO etudiant (id_etudiant, id_filiere, cne, cin, date_inscription, statut)
    VALUES (v_id_etu1, v_id_fil1, 'CNE-TEST-1', 'CIN-TEST-1', CURRENT_DATE, 'Actif'::enum_statut_etudiant) ON CONFLICT (cne) DO NOTHING;

    INSERT INTO utilisateur (id_utilisateur, id_role, nom, prenom, email, mot_de_passe, actif)
    VALUES (v_id_etu2, v_role_etu, 'Dupont', 'Sophie', 'sophie.dupont@smartcampus.ma', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjGsGZ0lY2', true) ON CONFLICT (email) DO NOTHING;
    INSERT INTO etudiant (id_etudiant, id_filiere, cne, cin, date_inscription, statut)
    VALUES (v_id_etu2, v_id_fil2, 'CNE-TEST-2', 'CIN-TEST-2', CURRENT_DATE, 'Actif'::enum_statut_etudiant) ON CONFLICT (cne) DO NOTHING;

    -- 5. Création des Cours enseignés par le Professeur
    INSERT INTO cours (id_cours, code, nom, credits, coefficient) VALUES (v_id_cours1, 'DEV101', 'Développement Web', 4, 2) ON CONFLICT (code) DO NOTHING;
    INSERT INTO cours (id_cours, code, nom, credits, coefficient) VALUES (v_id_cours2, 'BDD201', 'Bases de Données Avancées', 4, 2) ON CONFLICT (code) DO NOTHING;

    INSERT INTO cours_professeur (id_cours, id_professeur) VALUES (v_id_cours1, v_id_prof) ON CONFLICT DO NOTHING;
    INSERT INTO cours_professeur (id_cours, id_professeur) VALUES (v_id_cours2, v_id_prof) ON CONFLICT DO NOTHING;

    -- 6. Création d'une Salle
    INSERT INTO salle (id_salle, numero, nom, capacite, type, statut)
    VALUES (v_id_salle, 'A-100', 'Amphi Central', 150, 'Amphitheatre'::enum_type_salle, 'Disponible'::enum_statut_salle)
    ON CONFLICT (numero) DO NOTHING;

    -- 7. Nettoyage des séances précédentes de ce professeur
    DELETE FROM session_salle WHERE id_professeur = v_id_prof;

    -- 8. Insertion des cas de tests pour les séances
    -- Cas A : Séance Normale (Demain)
    INSERT INTO session_salle (id_session, id_salle, id_cours, id_professeur, id_filiere, date, heure_debut, heure_fin, statut)
    VALUES (gen_random_uuid(), v_id_salle, v_id_cours1, v_id_prof, v_id_fil1, CURRENT_DATE + INTERVAL '1 day', '08:30:00'::time, '10:30:00'::time, 'Planifiee'::enum_statut_session);

    -- Cas B : Deux séances en conflit à la même heure (Dans 2 jours)
    INSERT INTO session_salle (id_session, id_salle, id_cours, id_professeur, id_filiere, date, heure_debut, heure_fin, statut)
    VALUES (gen_random_uuid(), v_id_salle, v_id_cours1, v_id_prof, v_id_fil1, CURRENT_DATE + INTERVAL '2 days', '10:00:00'::time, '12:00:00'::time, 'Planifiee'::enum_statut_session);

    INSERT INTO session_salle (id_session, id_salle, id_cours, id_professeur, id_filiere, date, heure_debut, heure_fin, statut)
    VALUES (gen_random_uuid(), v_id_salle, v_id_cours2, v_id_prof, v_id_fil2, CURRENT_DATE + INTERVAL '2 days', '10:00:00'::time, '12:00:00'::time, 'Planifiee'::enum_statut_session);

    -- Cas C : Séance dans le futur (Dans 30 jours, pour tester la clôture anticipée)
    INSERT INTO session_salle (id_session, id_salle, id_cours, id_professeur, id_filiere, date, heure_debut, heure_fin, statut)
    VALUES (gen_random_uuid(), v_id_salle, v_id_cours1, v_id_prof, v_id_fil1, CURRENT_DATE + INTERVAL '30 days', '14:00:00'::time, '16:00:00'::time, 'Planifiee'::enum_statut_session);

    RAISE NOTICE 'Données de test insérées avec succès !';
END $$;


UPDATE utilisateur 
SET mot_de_passe = '$2b$10$u9.E4r5JYrxRXgovx3Wp/uxMHctx2K/hg5mTZqN5YGKqrrT4ZewhC'
WHERE email = 'prof.test@smartcampus.ma';