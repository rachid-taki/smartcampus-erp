-- =====================================================================
-- SMARTCAMPUS ERP - SCHEMA SQL (MySQL 8.0+ / InnoDB)
-- Adapté depuis la version PostgreSQL du diagramme de classes UML.
-- =====================================================================
--
-- ADAPTATIONS SPÉCIFIQUES MYSQL (par rapport à la version PostgreSQL) :
-- 1. Pas de CREATE TYPE ENUM partagé : MySQL ne supporte que des ENUM()
--    définis en ligne, colonne par colonne (répétés là où le même jeu
--    de valeurs est réutilisé).
-- 2. Clés primaires UUID : `CHAR(36) DEFAULT (UUID())` (fonctionnalité
--    disponible depuis MySQL 8.0.13, UUID() étant explicitement
--    autorisée comme expression par défaut).
-- 3. `updated_at` : plus besoin de trigger, MySQL gère nativement
--    `ON UPDATE CURRENT_TIMESTAMP` sur les colonnes DATETIME/TIMESTAMP.
-- 4. JSONB (PostgreSQL) -> JSON (MySQL).
-- 5. INET (PostgreSQL) -> VARCHAR(45) (compatible IPv4 et IPv6).
-- 6. BIGSERIAL -> BIGINT AUTO_INCREMENT.
-- 7. VECTOR (extension pgvector) retiré : MySQL standard ne propose
--    pas de type vectoriel natif ; stocker les embeddings en JSON
--    (tableau de floats) ou utiliser MySQL HeatWave / une base
--    vectorielle dédiée (Pinecone, Milvus...) en complément.
-- 8. CHECK constraints : supportées et appliquées depuis MySQL 8.0.16.
-- 9. ENGINE=InnoDB + utf8mb4 imposés sur toutes les tables (transactions,
--    clés étrangères, emojis/accents corrects).
--
-- =====================================================================

CREATE DATABASE IF NOT EXISTS smartcampus_erp
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smartcampus_erp;

SET default_storage_engine = INNODB;

-- =====================================================================
-- PACKAGE : AUTHENTIFICATION & UTILISATEURS
-- =====================================================================

CREATE TABLE role (
  id_role       CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  nom_role      VARCHAR(100) NOT NULL UNIQUE,
  description   TEXT,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE permission (
  id_permission CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  nom           VARCHAR(150) NOT NULL,
  module        VARCHAR(100) NOT NULL,
  description   TEXT,
  UNIQUE (nom, module)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Amélioration : table de jointure remplaçant ROLE.permissions (JSON)
CREATE TABLE role_permission (
  id_role       CHAR(36) NOT NULL,
  id_permission CHAR(36) NOT NULL,
  PRIMARY KEY (id_role, id_permission),
  FOREIGN KEY (id_role) REFERENCES role(id_role) ON DELETE CASCADE,
  FOREIGN KEY (id_permission) REFERENCES permission(id_permission) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE utilisateur (
  id_utilisateur      CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  id_role             CHAR(36) NOT NULL,
  nom                 VARCHAR(100) NOT NULL,
  prenom              VARCHAR(100) NOT NULL,
  email               VARCHAR(255) NOT NULL UNIQUE,
  mot_de_passe        VARCHAR(255) NOT NULL,     -- stocker un hash (bcrypt/argon2), jamais en clair
  telephone           VARCHAR(30),
  photo               VARCHAR(500),
  actif               BOOLEAN NOT NULL DEFAULT TRUE,
  date_creation       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  derniere_connexion  DATETIME,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_role) REFERENCES role(id_role) ON DELETE RESTRICT,
  INDEX idx_utilisateur_role (id_role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- PACKAGE : HIÉRARCHIE DES UTILISATEURS (héritage table par table)
-- =====================================================================

CREATE TABLE filiere (
  id_filiere    CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  nom           VARCHAR(150) NOT NULL,
  departement   VARCHAR(150) NOT NULL,
  niveau        VARCHAR(50) NOT NULL,
  duree         SMALLINT NOT NULL CHECK (duree > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE etudiant (
  id_etudiant       CHAR(36) PRIMARY KEY,
  id_filiere        CHAR(36) NOT NULL,
  cne               VARCHAR(20) NOT NULL UNIQUE,
  cin               VARCHAR(20) NOT NULL UNIQUE,
  code_apogee       VARCHAR(20) UNIQUE,
  niveau            VARCHAR(50),
  groupe            VARCHAR(50),
  email_academique  VARCHAR(255) UNIQUE,
  date_inscription  DATE NOT NULL DEFAULT (CURRENT_DATE),
  statut            ENUM('Actif','Diplome','Abandon') NOT NULL DEFAULT 'Actif',
  FOREIGN KEY (id_etudiant) REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
  FOREIGN KEY (id_filiere) REFERENCES filiere(id_filiere) ON DELETE RESTRICT,
  INDEX idx_etudiant_filiere (id_filiere),
  INDEX idx_etudiant_statut (statut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE employe (
  id_employe            CHAR(36) PRIMARY KEY,
  matricule             VARCHAR(30) NOT NULL UNIQUE,
  fonction              VARCHAR(150) NOT NULL,
  departement           VARCHAR(150),
  date_embauche         DATE NOT NULL,
  statut                ENUM('Actif','Inactif','Conge') NOT NULL DEFAULT 'Actif',
  grade                 VARCHAR(50),
  id_rh_gestionnaire    CHAR(36) NULL,   -- FK ajoutée après création de rh_responsable
  FOREIGN KEY (id_employe) REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
  INDEX idx_employe_statut (statut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE professeur (
  id_professeur         CHAR(36) PRIMARY KEY,
  specialite            VARCHAR(150),
  grade_academique      VARCHAR(100),
  heures_hebdomadaires  SMALLINT CHECK (heures_hebdomadaires >= 0),
  -- modulesEnseignes (JSON) supprimé : voir table cours_professeur
  FOREIGN KEY (id_professeur) REFERENCES employe(id_employe) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE scolarite_staff (
  id_scolarite  CHAR(36) PRIMARY KEY,
  service       VARCHAR(150),
  poste         VARCHAR(150),
  bureau        VARCHAR(50),
  FOREIGN KEY (id_scolarite) REFERENCES employe(id_employe) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE rh_responsable (
  id_rh             CHAR(36) PRIMARY KEY,
  service           VARCHAR(150),
  poste             VARCHAR(150),
  niveau_autorite   SMALLINT NOT NULL DEFAULT 1,
  bureau            VARCHAR(50),
  FOREIGN KEY (id_rh) REFERENCES employe(id_employe) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Amélioration : rh_responsable "gère" employe -> FK explicite
ALTER TABLE employe
  ADD CONSTRAINT fk_employe_rh_gestionnaire
  FOREIGN KEY (id_rh_gestionnaire) REFERENCES rh_responsable(id_rh) ON DELETE SET NULL;
CREATE INDEX idx_employe_rh_gestionnaire ON employe(id_rh_gestionnaire);

-- =====================================================================
-- PACKAGE : ÉTUDIANTS & SCOLARITÉ
-- =====================================================================

CREATE TABLE cours (
  id_cours    CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  code        VARCHAR(30) NOT NULL UNIQUE,
  nom         VARCHAR(200) NOT NULL,
  credits     SMALLINT NOT NULL CHECK (credits >= 0),
  coefficient SMALLINT NOT NULL CHECK (coefficient >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Amélioration : many-to-many réel (remplace professeur.modulesEnseignes)
CREATE TABLE cours_professeur (
  id_cours      CHAR(36) NOT NULL,
  id_professeur CHAR(36) NOT NULL,
  PRIMARY KEY (id_cours, id_professeur),
  FOREIGN KEY (id_cours) REFERENCES cours(id_cours) ON DELETE CASCADE,
  FOREIGN KEY (id_professeur) REFERENCES professeur(id_professeur) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE workflow (
  id_workflow   CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  nom           VARCHAR(150) NOT NULL,
  description   TEXT,
  statut        ENUM('Actif','Inactif') NOT NULL DEFAULT 'Actif',
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE type_demande (
  id_type           CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  libelle           VARCHAR(150) NOT NULL,
  code              VARCHAR(30) NOT NULL UNIQUE,
  description       TEXT,
  id_workflow       CHAR(36) NULL,
  delai_traitement  INT CHECK (delai_traitement >= 0),   -- en jours
  pieces_requises   JSON,
  FOREIGN KEY (id_workflow) REFERENCES workflow(id_workflow) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE etape_workflow (
  id_etape          CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  id_workflow       CHAR(36) NOT NULL,
  ordre             SMALLINT NOT NULL,
  nom               VARCHAR(150) NOT NULL,
  role_responsable  VARCHAR(100),
  statut            ENUM('En_Attente','En_Cours','Validee','Rejetee') NOT NULL DEFAULT 'En_Attente',
  date_debut        DATETIME,
  date_fin          DATETIME,
  commentaires      TEXT,
  FOREIGN KEY (id_workflow) REFERENCES workflow(id_workflow) ON DELETE CASCADE,
  UNIQUE (id_workflow, ordre),
  CHECK (date_fin IS NULL OR date_debut IS NULL OR date_fin >= date_debut),
  INDEX idx_etape_workflow_workflow (id_workflow)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE demande (
  id_demande        CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  numero            VARCHAR(50) NOT NULL UNIQUE,
  id_etudiant       CHAR(36) NOT NULL,
  id_type           CHAR(36) NOT NULL,
  id_workflow       CHAR(36) NOT NULL,
  id_traite_par     CHAR(36) NULL,
  objet             VARCHAR(255) NOT NULL,
  description       TEXT,
  date_creation     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  statut            ENUM('Brouillon','Soumise','En_Traitement','Validee','Rejetee','Cloturee') NOT NULL DEFAULT 'Brouillon',
  priorite          ENUM('Basse','Normale','Haute','Urgente') NOT NULL DEFAULT 'Normale',
  commentaires      TEXT,
  FOREIGN KEY (id_etudiant) REFERENCES etudiant(id_etudiant) ON DELETE CASCADE,
  FOREIGN KEY (id_type) REFERENCES type_demande(id_type) ON DELETE RESTRICT,
  FOREIGN KEY (id_workflow) REFERENCES workflow(id_workflow) ON DELETE RESTRICT,
  FOREIGN KEY (id_traite_par) REFERENCES scolarite_staff(id_scolarite) ON DELETE SET NULL,
  INDEX idx_demande_etudiant (id_etudiant),
  INDEX idx_demande_type (id_type),
  INDEX idx_demande_statut (statut),
  INDEX idx_demande_traite_par (id_traite_par)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE type_reclamation (
  id_type                 CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  libelle                 VARCHAR(150) NOT NULL,
  code                    VARCHAR(30) NOT NULL UNIQUE,
  categorie               ENUM('Note','AMO','Bourse','Email','Autre') NOT NULL,
  delai_limite            INT CHECK (delai_limite >= 0),
  quota_max               INT CHECK (quota_max >= 0),
  conditions_eligibilite  JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE reclamation (
  id_reclamation    CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  id_etudiant       CHAR(36) NOT NULL,
  id_type           CHAR(36) NOT NULL,
  id_cours          CHAR(36) NULL,
  id_traite_par     CHAR(36) NULL,
  objet             VARCHAR(255) NOT NULL,
  description       TEXT,
  date_soumission   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  statut            ENUM('Soumise','Recue','Transmise','Acceptee','Rejetee','Cloturee') NOT NULL DEFAULT 'Soumise',
  priorite          ENUM('Basse','Normale','Haute','Urgente') NOT NULL DEFAULT 'Normale',
  nombre_traitement INT NOT NULL DEFAULT 0,
  FOREIGN KEY (id_etudiant) REFERENCES etudiant(id_etudiant) ON DELETE CASCADE,
  FOREIGN KEY (id_type) REFERENCES type_reclamation(id_type) ON DELETE RESTRICT,
  FOREIGN KEY (id_cours) REFERENCES cours(id_cours) ON DELETE SET NULL,
  FOREIGN KEY (id_traite_par) REFERENCES scolarite_staff(id_scolarite) ON DELETE SET NULL,
  INDEX idx_reclamation_etudiant (id_etudiant),
  INDEX idx_reclamation_statut (statut),
  INDEX idx_reclamation_traite_par (id_traite_par)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Amélioration : DOCUMENT rattaché soit à une demande, soit à une
-- réclamation (jamais les deux), via un CHECK d'exclusivité.
CREATE TABLE document (
  id_document     CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  id_demande      CHAR(36) NULL,
  id_reclamation  CHAR(36) NULL,
  nom             VARCHAR(255) NOT NULL,
  type            VARCHAR(100),
  url             VARCHAR(500) NOT NULL,
  taille          INT CHECK (taille >= 0),
  hash            VARCHAR(128),
  version         INT NOT NULL DEFAULT 1,
  date_upload     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_demande) REFERENCES demande(id_demande) ON DELETE CASCADE,
  FOREIGN KEY (id_reclamation) REFERENCES reclamation(id_reclamation) ON DELETE CASCADE,
  CONSTRAINT chk_document_parent_unique CHECK (
    (id_demande IS NOT NULL) + (id_reclamation IS NOT NULL) = 1
  ),
  INDEX idx_document_demande (id_demande),
  INDEX idx_document_reclamation (id_reclamation)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE certificat_medical (
  id_certificat CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  id_etudiant   CHAR(36) NOT NULL,
  id_valide_par CHAR(36) NULL,
  date_depot    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fichier_url   VARCHAR(500) NOT NULL,
  date_debut    DATE NOT NULL,
  date_fin      DATE NOT NULL,
  motif         TEXT,
  statut        ENUM('En_Attente','Valide','Rejete') NOT NULL DEFAULT 'En_Attente',
  FOREIGN KEY (id_etudiant) REFERENCES etudiant(id_etudiant) ON DELETE CASCADE,
  FOREIGN KEY (id_valide_par) REFERENCES scolarite_staff(id_scolarite) ON DELETE SET NULL,
  CHECK (date_fin >= date_debut),
  INDEX idx_certificat_etudiant (id_etudiant)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- PACKAGE : RÉCLAMATIONS DE NOTES (PROFESSEUR)
-- =====================================================================

CREATE TABLE verification_examen (
  id_verification         CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  id_etudiant             CHAR(36) NOT NULL,
  id_professeur           CHAR(36) NOT NULL,
  id_transmis_par         CHAR(36) NULL,
  date_demande            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  motif                   TEXT,
  statut                  ENUM('Demandee','Acceptee','Rejetee','Planifiee','Consultee','Cloturee') NOT NULL DEFAULT 'Demandee',
  date_planification      DATE,
  heure_planification     TIME,
  salle_planification     VARCHAR(50),
  commentaires_prof       TEXT,
  commentaires_etudiant   TEXT,
  FOREIGN KEY (id_etudiant) REFERENCES etudiant(id_etudiant) ON DELETE CASCADE,
  FOREIGN KEY (id_professeur) REFERENCES professeur(id_professeur) ON DELETE CASCADE,
  FOREIGN KEY (id_transmis_par) REFERENCES scolarite_staff(id_scolarite) ON DELETE SET NULL,
  INDEX idx_verif_examen_etudiant (id_etudiant),
  INDEX idx_verif_examen_professeur (id_professeur)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- PACKAGE : RESSOURCES HUMAINES
-- =====================================================================

CREATE TABLE demande_rh (
  id_demande_rh   CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  id_employe      CHAR(36) NOT NULL,
  id_traite_par   CHAR(36) NULL,
  type            ENUM('Attestation_Travail','Attestation_Salaire','Conge_Normal','Conge_Exceptionnel','Conge_Maladie','Heure_Supplementaire','Mission','Autre') NOT NULL,
  statut          ENUM('Brouillon','Soumise','En_Traitement','Validee','Rejetee','Cloturee') NOT NULL DEFAULT 'Soumise',
  date_demande    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_debut      DATE,
  date_fin        DATE,
  duree           INT CHECK (duree >= 0),
  motif           TEXT,
  justificatif    VARCHAR(500),
  commentaires_rh TEXT,
  FOREIGN KEY (id_employe) REFERENCES employe(id_employe) ON DELETE CASCADE,
  FOREIGN KEY (id_traite_par) REFERENCES rh_responsable(id_rh) ON DELETE SET NULL,
  CHECK (date_fin IS NULL OR date_debut IS NULL OR date_fin >= date_debut),
  INDEX idx_demande_rh_employe (id_employe),
  INDEX idx_demande_rh_traite_par (id_traite_par)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- PACKAGE : CLUBS & VIE ÉTUDIANTE
-- =====================================================================

CREATE TABLE club (
  id_club       CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  nom           VARCHAR(150) NOT NULL UNIQUE,
  description   TEXT,
  date_creation DATE NOT NULL DEFAULT (CURRENT_DATE),
  statut        ENUM('Actif','Inactif','Suspendu') NOT NULL DEFAULT 'Actif',
  budget        DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (budget >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE president_club (
  id_president      CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  id_club           CHAR(36) NOT NULL UNIQUE,
  id_etudiant       CHAR(36) NOT NULL,
  id_designe_par    CHAR(36) NULL,
  date_designation  DATE NOT NULL DEFAULT (CURRENT_DATE),
  date_fin_mandat   DATE,
  statut            ENUM('Actif','Expire') NOT NULL DEFAULT 'Actif',
  FOREIGN KEY (id_club) REFERENCES club(id_club) ON DELETE CASCADE,
  FOREIGN KEY (id_etudiant) REFERENCES etudiant(id_etudiant) ON DELETE CASCADE,
  FOREIGN KEY (id_designe_par) REFERENCES scolarite_staff(id_scolarite) ON DELETE SET NULL,
  CHECK (date_fin_mandat IS NULL OR date_fin_mandat >= date_designation),
  INDEX idx_president_club_etudiant (id_etudiant)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE demande_club (
  id_demande_club CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  id_club         CHAR(36) NOT NULL,
  id_president    CHAR(36) NOT NULL,
  id_traite_par   CHAR(36) NULL,
  type            ENUM('Evenement','Salle','Materiel','Budget','Communication','Sponsoring') NOT NULL,
  objet           VARCHAR(255) NOT NULL,
  description     TEXT,
  date_demande    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  statut          ENUM('Soumise','En_Revue','Approuvee','Rejetee') NOT NULL DEFAULT 'Soumise',
  date_evenement  DATE,
  heure_debut     TIME,
  heure_fin       TIME,
  budget_demande  DECIMAL(12,2) CHECK (budget_demande >= 0),
  justificatifs   JSON,
  FOREIGN KEY (id_club) REFERENCES club(id_club) ON DELETE CASCADE,
  FOREIGN KEY (id_president) REFERENCES president_club(id_president) ON DELETE CASCADE,
  FOREIGN KEY (id_traite_par) REFERENCES scolarite_staff(id_scolarite) ON DELETE SET NULL,
  INDEX idx_demande_club_club (id_club),
  INDEX idx_demande_club_president (id_president)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- PACKAGE : SMART CAMPUS & SALLES INTELLIGENTES
-- =====================================================================

CREATE TABLE salle (
  id_salle      CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  numero        VARCHAR(30) NOT NULL UNIQUE,
  nom           VARCHAR(150),
  capacite      SMALLINT NOT NULL CHECK (capacite > 0),
  type          ENUM('Amphitheatre','Salle_Cours','Laboratoire','Salle_Reunion') NOT NULL,
  equipements   JSON,
  localisation  VARCHAR(255),
  statut        ENUM('Disponible','Occupee','Maintenance') NOT NULL DEFAULT 'Disponible'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE session_salle (
  id_session          CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  id_salle            CHAR(36) NOT NULL,
  id_cours            CHAR(36) NOT NULL,
  id_professeur       CHAR(36) NOT NULL,
  date                DATE NOT NULL,
  heure_debut         TIME NOT NULL,
  heure_fin           TIME NOT NULL,
  heure_debut_reelle  TIME,
  heure_fin_reelle    TIME,
  statut              ENUM('Planifiee','En_Cours','Terminee','Annulee') NOT NULL DEFAULT 'Planifiee',
  nombre_etudiants    INT CHECK (nombre_etudiants >= 0),
  retard_moyen        INT CHECK (retard_moyen >= 0),   -- en minutes
  FOREIGN KEY (id_salle) REFERENCES salle(id_salle) ON DELETE CASCADE,
  FOREIGN KEY (id_cours) REFERENCES cours(id_cours) ON DELETE CASCADE,
  FOREIGN KEY (id_professeur) REFERENCES professeur(id_professeur) ON DELETE RESTRICT,
  CHECK (heure_fin > heure_debut),
  INDEX idx_session_salle_salle (id_salle),
  INDEX idx_session_salle_cours (id_cours),
  INDEX idx_session_salle_professeur (id_professeur),
  INDEX idx_session_salle_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE presence_etudiant (
  id_presence             CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  id_session              CHAR(36) NOT NULL,
  id_etudiant             CHAR(36) NOT NULL,
  heure_arrivee           TIME,
  heure_depart            TIME,
  statut                  ENUM('Present','Retard','Absent','Excuse') NOT NULL DEFAULT 'Absent',
  methode_identification  ENUM('RFID','QR_Code','Reconnaissance_Faciale'),
  FOREIGN KEY (id_session) REFERENCES session_salle(id_session) ON DELETE CASCADE,
  FOREIGN KEY (id_etudiant) REFERENCES etudiant(id_etudiant) ON DELETE CASCADE,
  UNIQUE (id_session, id_etudiant),
  INDEX idx_presence_session (id_session),
  INDEX idx_presence_etudiant (id_etudiant)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE reservation_salle (
  id_reservation  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  id_salle        CHAR(36) NOT NULL,
  id_demandeur    CHAR(36) NOT NULL,
  date            DATE NOT NULL,
  heure_debut     TIME NOT NULL,
  heure_fin       TIME NOT NULL,
  motif           VARCHAR(255),
  statut          ENUM('Demandee','Approuvee','Rejetee','Annulee') NOT NULL DEFAULT 'Demandee',
  FOREIGN KEY (id_salle) REFERENCES salle(id_salle) ON DELETE CASCADE,
  FOREIGN KEY (id_demandeur) REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
  CHECK (heure_fin > heure_debut),
  INDEX idx_reservation_salle_salle (id_salle),
  INDEX idx_reservation_salle_demandeur (id_demandeur)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE alerte_ia (
  id_alerte       CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  id_salle        CHAR(36) NULL,
  type            ENUM('Conflit_Planning','Salle_Fantome','Surcharge','Anomalie') NOT NULL,
  description     TEXT,
  date_detection  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  statut          ENUM('Nouvelle','En_Traitement','Resolue','Ignoree') NOT NULL DEFAULT 'Nouvelle',
  priorite        ENUM('Basse','Normale','Haute','Urgente') NOT NULL DEFAULT 'Normale',
  FOREIGN KEY (id_salle) REFERENCES salle(id_salle) ON DELETE SET NULL,
  INDEX idx_alerte_ia_salle (id_salle),
  INDEX idx_alerte_ia_statut (statut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- PACKAGE : MESSAGERIE & NOTIFICATIONS
-- =====================================================================

CREATE TABLE conversation (
  id_conversation CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  sujet           VARCHAR(255),
  date_creation   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  statut          ENUM('Ouverte','Fermee') NOT NULL DEFAULT 'Ouverte'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Amélioration : many-to-many réel (remplace la relation directe
-- utilisateur -- conversation, qui ne peut porter qu'un seul participant)
CREATE TABLE conversation_participant (
  id_conversation CHAR(36) NOT NULL,
  id_utilisateur  CHAR(36) NOT NULL,
  date_ajout      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_conversation, id_utilisateur),
  FOREIGN KEY (id_conversation) REFERENCES conversation(id_conversation) ON DELETE CASCADE,
  FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE message (
  id_message      CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  id_conversation CHAR(36) NOT NULL,
  id_expediteur   CHAR(36) NOT NULL,
  contenu         TEXT NOT NULL,
  date_envoi      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lu              BOOLEAN NOT NULL DEFAULT FALSE,
  pieces_jointes  JSON,
  FOREIGN KEY (id_conversation) REFERENCES conversation(id_conversation) ON DELETE CASCADE,
  FOREIGN KEY (id_expediteur) REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
  INDEX idx_message_conversation (id_conversation),
  INDEX idx_message_expediteur (id_expediteur)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE notification (
  id_notification CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  id_utilisateur  CHAR(36) NOT NULL,
  titre           VARCHAR(255) NOT NULL,
  message         TEXT NOT NULL,
  type            ENUM('Email','SMS','Push','Plateforme') NOT NULL,
  date_envoi      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lu              BOOLEAN NOT NULL DEFAULT FALSE,
  priorite        ENUM('Info','Warning','Urgent') NOT NULL DEFAULT 'Info',
  FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
  INDEX idx_notification_utilisateur (id_utilisateur),
  INDEX idx_notification_lu (lu)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- PACKAGE : ASSISTANT IA & CHATBOT
-- =====================================================================

CREATE TABLE base_connaissance (
  id_base   CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  titre     VARCHAR(255) NOT NULL,
  contenu   TEXT NOT NULL,
  categorie VARCHAR(100),
  date_maj  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  vecteur   JSON   -- embedding stocké en tableau JSON de floats ; pour une vraie recherche vectorielle, utiliser une base dédiée (Pinecone, Milvus...) ou MySQL HeatWave
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE conversation_ia (
  id_conversation_ia  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  id_etudiant         CHAR(36) NOT NULL,
  date_creation       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  statut              ENUM('Active','Cloturee') NOT NULL DEFAULT 'Active',
  satisfaction        TINYINT CHECK (satisfaction BETWEEN 1 AND 5),
  FOREIGN KEY (id_etudiant) REFERENCES etudiant(id_etudiant) ON DELETE CASCADE,
  INDEX idx_conversation_ia_etudiant (id_etudiant)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE message_ia (
  id_message_ia       CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  id_conversation_ia  CHAR(36) NOT NULL,
  id_base             CHAR(36) NULL,
  role                ENUM('User','Assistant','System') NOT NULL,
  contenu             TEXT NOT NULL,
  date_envoi          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tokens              INT CHECK (tokens >= 0),
  FOREIGN KEY (id_conversation_ia) REFERENCES conversation_ia(id_conversation_ia) ON DELETE CASCADE,
  FOREIGN KEY (id_base) REFERENCES base_connaissance(id_base) ON DELETE SET NULL,
  INDEX idx_message_ia_conversation (id_conversation_ia),
  INDEX idx_message_ia_base (id_base)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- PACKAGE : AUDIT & TRAÇABILITÉ
-- =====================================================================

CREATE TABLE audit_log (
  id_log          BIGINT AUTO_INCREMENT PRIMARY KEY,   -- volumétrie élevée attendue : clé séquentielle plus légère qu'un UUID
  id_utilisateur  CHAR(36) NULL,
  action          VARCHAR(100) NOT NULL,
  module          VARCHAR(100) NOT NULL,
  entite          VARCHAR(100) NOT NULL,
  entite_id       CHAR(36),
  date_action     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  adresse_ip      VARCHAR(45),   -- compatible IPv4 et IPv6
  user_agent      VARCHAR(500),
  donnees_avant   JSON,
  donnees_apres   JSON,
  FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur) ON DELETE SET NULL,
  INDEX idx_audit_log_utilisateur (id_utilisateur),
  INDEX idx_audit_log_entite (entite, entite_id),
  INDEX idx_audit_log_date (date_action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- PACKAGE : CONFIGURATION SYSTÈME
-- =====================================================================

CREATE TABLE parametre_systeme (
  id_parametre  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  cle           VARCHAR(150) NOT NULL UNIQUE,
  valeur        TEXT,
  type          ENUM('String','Integer','Boolean','JSON') NOT NULL DEFAULT 'String',
  description   TEXT,
  module        VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE calendrier_academique (
  id_calendrier   CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  nom             VARCHAR(150) NOT NULL,
  annee_scolaire  VARCHAR(20) NOT NULL UNIQUE,
  date_debut      DATE NOT NULL,
  date_fin        DATE NOT NULL,
  periodes        JSON,
  CHECK (date_fin >= date_debut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- FIN DU SCRIPT
-- =====================================================================
-- Pré-requis : MySQL 8.0.13+ pour DEFAULT (UUID()), MySQL 8.0.16+ pour
-- l'application effective des contraintes CHECK. Sur une version plus
-- ancienne (5.7 / 8.0 < .16), retirer les CHECK et générer les UUID
-- côté application ou via un trigger BEFORE INSERT.
-- =====================================================================