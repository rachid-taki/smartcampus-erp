-- =====================================================================
-- SMARTCAMPUS ERP - SCHEMA SQL (PostgreSQL 14+)
-- Converti depuis la version MySQL 8.0 fournie.
-- =====================================================================
--
-- ADAPTATIONS SPÉCIFIQUES POSTGRESQL (par rapport à la version MySQL) :
-- 1. `CHAR(36) DEFAULT (UUID())` -> type natif `UUID DEFAULT
--    gen_random_uuid()` (extension pgcrypto).
-- 2. `ENUM('a','b')` en ligne -> types ENUM nommés et réutilisables
--    créés via `CREATE TYPE ... AS ENUM (...)`, déclarés une fois en
--    tête de script puis référencés dans les colonnes.
-- 3. `DATETIME ... ON UPDATE CURRENT_TIMESTAMP` -> PostgreSQL n'a pas
--    d'équivalent natif : colonnes en `TIMESTAMPTZ DEFAULT now()` +
--    trigger générique `trg_set_updated_at` sur les tables concernées
--    (ici `role` et `utilisateur`).
-- 4. `INDEX nom (colonne)` déclaré à l'intérieur du CREATE TABLE
--    (syntaxe MySQL) -> non supporté par PostgreSQL : tous les index
--    sont recréés avec des instructions `CREATE INDEX` séparées après
--    la table.
-- 5. `JSON` -> `JSONB` (indexable et plus performant sous PostgreSQL).
-- 6. `TINYINT` -> `SMALLINT` (pas de TINYINT en PostgreSQL).
-- 7. `DECIMAL(12,2)` -> `NUMERIC(12,2)` (alias strictement équivalent,
--    NUMERIC est la convention idiomatique en PostgreSQL).
-- 8. `AUTO_INCREMENT` -> `BIGSERIAL` (compteur auto-incrémenté natif).
-- 9. `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4` : supprimé, sans
--    équivalent (PostgreSQL n'a qu'un seul moteur de stockage
--    transactionnel et gère l'encodage au niveau de la base).
-- 10. CHECK d'exclusivité sur DOCUMENT : MySQL caste implicitement les
--     booléens en entier (`(x IS NOT NULL) + (y IS NOT NULL) = 1`) ;
--     PostgreSQL exige un cast explicite `::int`.
-- 11. `CREATE DATABASE IF NOT EXISTS` / `USE db` : non supportés par
--     PostgreSQL. Créez la base séparément (`createdb smartcampus_erp`
--     ou `CREATE DATABASE smartcampus_erp;` via psql), puis connectez-
--     vous avec `\c smartcampus_erp` avant d'exécuter ce script.
--
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- pour gen_random_uuid()

-- =====================================================================
-- FONCTION UTILITAIRE : auto-update de updated_at
-- =====================================================================
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- ENUMS
-- =====================================================================
CREATE TYPE enum_statut_etudiant       AS ENUM ('Actif','Diplome','Abandon');
CREATE TYPE enum_statut_employe        AS ENUM ('Actif','Inactif','Conge');
CREATE TYPE enum_statut_workflow       AS ENUM ('Actif','Inactif');
CREATE TYPE enum_statut_etape          AS ENUM ('En_Attente','En_Cours','Validee','Rejetee');
CREATE TYPE enum_statut_demande        AS ENUM ('Brouillon','Soumise','En_Traitement','Validee','Rejetee','Cloturee');
CREATE TYPE enum_priorite              AS ENUM ('Basse','Normale','Haute','Urgente');
CREATE TYPE enum_categorie_reclamation AS ENUM ('Note','AMO','Bourse','Email','Autre');
CREATE TYPE enum_statut_reclamation    AS ENUM ('Soumise','Recue','Transmise','Acceptee','Rejetee','Cloturee');
CREATE TYPE enum_statut_certificat     AS ENUM ('En_Attente','Valide','Rejete');
CREATE TYPE enum_statut_verification   AS ENUM ('Demandee','Acceptee','Rejetee','Planifiee','Consultee','Cloturee');
CREATE TYPE enum_type_demande_rh       AS ENUM ('Attestation_Travail','Attestation_Salaire','Conge_Normal','Conge_Exceptionnel','Conge_Maladie','Heure_Supplementaire','Mission','Autre');
CREATE TYPE enum_statut_club           AS ENUM ('Actif','Inactif','Suspendu');
CREATE TYPE enum_statut_president      AS ENUM ('Actif','Expire');
CREATE TYPE enum_type_demande_club     AS ENUM ('Evenement','Salle','Materiel','Budget','Communication','Sponsoring');
CREATE TYPE enum_statut_demande_club   AS ENUM ('Soumise','En_Revue','Approuvee','Rejetee');
CREATE TYPE enum_type_salle            AS ENUM ('Amphitheatre','Salle_Cours','Laboratoire','Salle_Reunion');
CREATE TYPE enum_statut_salle          AS ENUM ('Disponible','Occupee','Maintenance');
CREATE TYPE enum_statut_session        AS ENUM ('Planifiee','En_Cours','Terminee','Annulee');
CREATE TYPE enum_statut_presence       AS ENUM ('Present','Retard','Absent','Excuse');
CREATE TYPE enum_methode_identification AS ENUM ('RFID','QR_Code','Reconnaissance_Faciale');
CREATE TYPE enum_statut_reservation    AS ENUM ('Demandee','Approuvee','Rejetee','Annulee');
CREATE TYPE enum_type_alerte           AS ENUM ('Conflit_Planning','Salle_Fantome','Surcharge','Anomalie');
CREATE TYPE enum_statut_alerte         AS ENUM ('Nouvelle','En_Traitement','Resolue','Ignoree');
CREATE TYPE enum_statut_conversation   AS ENUM ('Ouverte','Fermee');
CREATE TYPE enum_type_notification     AS ENUM ('Email','SMS','Push','Plateforme');
CREATE TYPE enum_priorite_notification AS ENUM ('Info','Warning','Urgent');
CREATE TYPE enum_statut_conversation_ia AS ENUM ('Active','Cloturee');
CREATE TYPE enum_role_message_ia       AS ENUM ('User','Assistant','System');
CREATE TYPE enum_type_parametre        AS ENUM ('String','Integer','Boolean','JSON');

-- =====================================================================
-- PACKAGE : AUTHENTIFICATION & UTILISATEURS
-- =====================================================================

CREATE TABLE role (
  id_role       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_role      VARCHAR(100) NOT NULL UNIQUE,
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_role_updated_at BEFORE UPDATE ON role
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TABLE permission (
  id_permission UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom           VARCHAR(150) NOT NULL,
  module        VARCHAR(100) NOT NULL,
  description   TEXT,
  UNIQUE (nom, module)
);

-- Table de jointure remplaçant ROLE.permissions (JSON)
CREATE TABLE role_permission (
  id_role       UUID NOT NULL REFERENCES role(id_role) ON DELETE CASCADE,
  id_permission UUID NOT NULL REFERENCES permission(id_permission) ON DELETE CASCADE,
  PRIMARY KEY (id_role, id_permission)
);

CREATE TABLE utilisateur (
  id_utilisateur      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_role             UUID NOT NULL REFERENCES role(id_role) ON DELETE RESTRICT,
  nom                 VARCHAR(100) NOT NULL,
  prenom              VARCHAR(100) NOT NULL,
  email               VARCHAR(255) NOT NULL UNIQUE,
  mot_de_passe        VARCHAR(255) NOT NULL,     -- stocker un hash (bcrypt/argon2), jamais en clair
  telephone           VARCHAR(30),
  photo               VARCHAR(500),
  actif               BOOLEAN NOT NULL DEFAULT TRUE,
  date_creation       TIMESTAMPTZ NOT NULL DEFAULT now(),
  derniere_connexion  TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_utilisateur_role ON utilisateur(id_role);
CREATE TRIGGER trg_utilisateur_updated_at BEFORE UPDATE ON utilisateur
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- =====================================================================
-- PACKAGE : HIÉRARCHIE DES UTILISATEURS (héritage table par table)
-- =====================================================================

CREATE TABLE filiere (
  id_filiere    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom           VARCHAR(150) NOT NULL,
  departement   VARCHAR(150) NOT NULL,
  niveau        VARCHAR(50) NOT NULL,
  duree         SMALLINT NOT NULL CHECK (duree > 0)
);

CREATE TABLE etudiant (
  id_etudiant       UUID PRIMARY KEY REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
  id_filiere        UUID NOT NULL REFERENCES filiere(id_filiere) ON DELETE RESTRICT,
  cne               VARCHAR(20) NOT NULL UNIQUE,
  cin               VARCHAR(20) NOT NULL UNIQUE,
  code_apogee       VARCHAR(20) UNIQUE,
  niveau            VARCHAR(50),
  groupe            VARCHAR(50),
  email_academique  VARCHAR(255) UNIQUE,
  date_inscription  DATE NOT NULL DEFAULT CURRENT_DATE,
  statut            enum_statut_etudiant NOT NULL DEFAULT 'Actif'
);
CREATE INDEX idx_etudiant_filiere ON etudiant(id_filiere);
CREATE INDEX idx_etudiant_statut  ON etudiant(statut);

CREATE TABLE employe (
  id_employe            UUID PRIMARY KEY REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
  matricule             VARCHAR(30) NOT NULL UNIQUE,
  fonction              VARCHAR(150) NOT NULL,
  departement           VARCHAR(150),
  date_embauche         DATE NOT NULL,
  statut                enum_statut_employe NOT NULL DEFAULT 'Actif',
  grade                 VARCHAR(50),
  id_rh_gestionnaire    UUID NULL   -- FK ajoutée après création de rh_responsable
);
CREATE INDEX idx_employe_statut ON employe(statut);

CREATE TABLE professeur (
  id_professeur         UUID PRIMARY KEY REFERENCES employe(id_employe) ON DELETE CASCADE,
  specialite            VARCHAR(150),
  grade_academique      VARCHAR(100),
  heures_hebdomadaires  SMALLINT CHECK (heures_hebdomadaires >= 0)
  -- modulesEnseignes (JSON) supprimé : voir table cours_professeur
);

CREATE TABLE scolarite_staff (
  id_scolarite  UUID PRIMARY KEY REFERENCES employe(id_employe) ON DELETE CASCADE,
  service       VARCHAR(150),
  poste         VARCHAR(150),
  bureau        VARCHAR(50)
);

CREATE TABLE rh_responsable (
  id_rh             UUID PRIMARY KEY REFERENCES employe(id_employe) ON DELETE CASCADE,
  service           VARCHAR(150),
  poste             VARCHAR(150),
  niveau_autorite   SMALLINT NOT NULL DEFAULT 1,
  bureau            VARCHAR(50)
);

-- Amélioration : rh_responsable "gère" employe -> FK explicite
ALTER TABLE employe
  ADD CONSTRAINT fk_employe_rh_gestionnaire
  FOREIGN KEY (id_rh_gestionnaire) REFERENCES rh_responsable(id_rh) ON DELETE SET NULL;
CREATE INDEX idx_employe_rh_gestionnaire ON employe(id_rh_gestionnaire);

-- =====================================================================
-- PACKAGE : ÉTUDIANTS & SCOLARITÉ
-- =====================================================================

CREATE TABLE cours (
  id_cours    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(30) NOT NULL UNIQUE,
  nom         VARCHAR(200) NOT NULL,
  credits     SMALLINT NOT NULL CHECK (credits >= 0),
  coefficient SMALLINT NOT NULL CHECK (coefficient >= 0)
);

-- Table many-to-many remplaçant professeur.modulesEnseignes
CREATE TABLE cours_professeur (
  id_cours      UUID NOT NULL REFERENCES cours(id_cours) ON DELETE CASCADE,
  id_professeur UUID NOT NULL REFERENCES professeur(id_professeur) ON DELETE CASCADE,
  PRIMARY KEY (id_cours, id_professeur)
);

CREATE TABLE workflow (
  id_workflow   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom           VARCHAR(150) NOT NULL,
  description   TEXT,
  statut        enum_statut_workflow NOT NULL DEFAULT 'Actif',
  date_creation TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE type_demande (
  id_type           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  libelle           VARCHAR(150) NOT NULL,
  code              VARCHAR(30) NOT NULL UNIQUE,
  description       TEXT,
  id_workflow       UUID NULL REFERENCES workflow(id_workflow) ON DELETE SET NULL,
  delai_traitement  INTEGER CHECK (delai_traitement >= 0),   -- en jours
  pieces_requises   JSONB
);

CREATE TABLE etape_workflow (
  id_etape          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_workflow       UUID NOT NULL REFERENCES workflow(id_workflow) ON DELETE CASCADE,
  ordre             SMALLINT NOT NULL,
  nom               VARCHAR(150) NOT NULL,
  role_responsable  VARCHAR(100),
  statut            enum_statut_etape NOT NULL DEFAULT 'En_Attente',
  date_debut        TIMESTAMPTZ,
  date_fin          TIMESTAMPTZ,
  commentaires      TEXT,
  UNIQUE (id_workflow, ordre),
  CHECK (date_fin IS NULL OR date_debut IS NULL OR date_fin >= date_debut)
);
CREATE INDEX idx_etape_workflow_workflow ON etape_workflow(id_workflow);

CREATE TABLE demande (
  id_demande        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero            VARCHAR(50) NOT NULL UNIQUE,
  id_etudiant       UUID NOT NULL REFERENCES etudiant(id_etudiant) ON DELETE CASCADE,
  id_type           UUID NOT NULL REFERENCES type_demande(id_type) ON DELETE RESTRICT,
  id_workflow       UUID NOT NULL REFERENCES workflow(id_workflow) ON DELETE RESTRICT,
  id_traite_par     UUID NULL REFERENCES scolarite_staff(id_scolarite) ON DELETE SET NULL,
  objet             VARCHAR(255) NOT NULL,
  description       TEXT,
  date_creation     TIMESTAMPTZ NOT NULL DEFAULT now(),
  statut            enum_statut_demande NOT NULL DEFAULT 'Brouillon',
  priorite          enum_priorite NOT NULL DEFAULT 'Normale',
  commentaires      TEXT
);
CREATE INDEX idx_demande_etudiant   ON demande(id_etudiant);
CREATE INDEX idx_demande_type       ON demande(id_type);
CREATE INDEX idx_demande_statut     ON demande(statut);
CREATE INDEX idx_demande_traite_par ON demande(id_traite_par);

CREATE TABLE type_reclamation (
  id_type                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  libelle                 VARCHAR(150) NOT NULL,
  code                    VARCHAR(30) NOT NULL UNIQUE,
  categorie               enum_categorie_reclamation NOT NULL,
  delai_limite            INTEGER CHECK (delai_limite >= 0),
  quota_max               INTEGER CHECK (quota_max >= 0),
  conditions_eligibilite  JSONB
);

CREATE TABLE reclamation (
  id_reclamation    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_etudiant       UUID NOT NULL REFERENCES etudiant(id_etudiant) ON DELETE CASCADE,
  id_type           UUID NOT NULL REFERENCES type_reclamation(id_type) ON DELETE RESTRICT,
  id_cours          UUID NULL REFERENCES cours(id_cours) ON DELETE SET NULL,
  id_traite_par     UUID NULL REFERENCES scolarite_staff(id_scolarite) ON DELETE SET NULL,
  objet             VARCHAR(255) NOT NULL,
  description       TEXT,
  date_soumission   TIMESTAMPTZ NOT NULL DEFAULT now(),
  statut            enum_statut_reclamation NOT NULL DEFAULT 'Soumise',
  priorite          enum_priorite NOT NULL DEFAULT 'Normale',
  nombre_traitement INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_reclamation_etudiant   ON reclamation(id_etudiant);
CREATE INDEX idx_reclamation_statut     ON reclamation(statut);
CREATE INDEX idx_reclamation_traite_par ON reclamation(id_traite_par);

-- DOCUMENT rattaché soit à une demande, soit à une réclamation
-- (jamais les deux), via un CHECK d'exclusivité.
CREATE TABLE document (
  id_document     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_demande      UUID NULL REFERENCES demande(id_demande) ON DELETE CASCADE,
  id_reclamation  UUID NULL REFERENCES reclamation(id_reclamation) ON DELETE CASCADE,
  nom             VARCHAR(255) NOT NULL,
  type            VARCHAR(100),
  url             VARCHAR(500) NOT NULL,
  taille          INTEGER CHECK (taille >= 0),
  hash            VARCHAR(128),
  version         INTEGER NOT NULL DEFAULT 1,
  date_upload     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_document_parent_unique CHECK (
    (id_demande IS NOT NULL)::int + (id_reclamation IS NOT NULL)::int = 1
  )
);
CREATE INDEX idx_document_demande     ON document(id_demande);
CREATE INDEX idx_document_reclamation ON document(id_reclamation);

CREATE TABLE certificat_medical (
  id_certificat UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_etudiant   UUID NOT NULL REFERENCES etudiant(id_etudiant) ON DELETE CASCADE,
  id_valide_par UUID NULL REFERENCES scolarite_staff(id_scolarite) ON DELETE SET NULL,
  date_depot    TIMESTAMPTZ NOT NULL DEFAULT now(),
  fichier_url   VARCHAR(500) NOT NULL,
  date_debut    DATE NOT NULL,
  date_fin      DATE NOT NULL,
  motif         TEXT,
  statut        enum_statut_certificat NOT NULL DEFAULT 'En_Attente',
  CHECK (date_fin >= date_debut)
);
CREATE INDEX idx_certificat_etudiant ON certificat_medical(id_etudiant);

-- =====================================================================
-- PACKAGE : RÉCLAMATIONS DE NOTES (PROFESSEUR)
-- =====================================================================

CREATE TABLE verification_examen (
  id_verification         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_etudiant             UUID NOT NULL REFERENCES etudiant(id_etudiant) ON DELETE CASCADE,
  id_professeur           UUID NOT NULL REFERENCES professeur(id_professeur) ON DELETE CASCADE,
  id_transmis_par         UUID NULL REFERENCES scolarite_staff(id_scolarite) ON DELETE SET NULL,
  date_demande            TIMESTAMPTZ NOT NULL DEFAULT now(),
  motif                   TEXT,
  statut                  enum_statut_verification NOT NULL DEFAULT 'Demandee',
  date_planification      DATE,
  heure_planification     TIME,
  salle_planification     VARCHAR(50),
  commentaires_prof       TEXT,
  commentaires_etudiant   TEXT
);
CREATE INDEX idx_verif_examen_etudiant   ON verification_examen(id_etudiant);
CREATE INDEX idx_verif_examen_professeur ON verification_examen(id_professeur);

-- =====================================================================
-- PACKAGE : RESSOURCES HUMAINES
-- =====================================================================

CREATE TABLE demande_rh (
  id_demande_rh   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_employe      UUID NOT NULL REFERENCES employe(id_employe) ON DELETE CASCADE,
  id_traite_par   UUID NULL REFERENCES rh_responsable(id_rh) ON DELETE SET NULL,
  type            enum_type_demande_rh NOT NULL,
  statut          enum_statut_demande NOT NULL DEFAULT 'Soumise',
  date_demande    TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_debut      DATE,
  date_fin        DATE,
  duree           INTEGER CHECK (duree >= 0),
  motif           TEXT,
  justificatif    VARCHAR(500),
  commentaires_rh TEXT,
  CHECK (date_fin IS NULL OR date_debut IS NULL OR date_fin >= date_debut)
);
CREATE INDEX idx_demande_rh_employe    ON demande_rh(id_employe);
CREATE INDEX idx_demande_rh_traite_par ON demande_rh(id_traite_par);

-- =====================================================================
-- PACKAGE : CLUBS & VIE ÉTUDIANTE
-- =====================================================================

CREATE TABLE club (
  id_club       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom           VARCHAR(150) NOT NULL UNIQUE,
  description   TEXT,
  date_creation DATE NOT NULL DEFAULT CURRENT_DATE,
  statut        enum_statut_club NOT NULL DEFAULT 'Actif',
  budget        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (budget >= 0)
);

CREATE TABLE president_club (
  id_president      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_club           UUID NOT NULL UNIQUE REFERENCES club(id_club) ON DELETE CASCADE,
  id_etudiant       UUID NOT NULL REFERENCES etudiant(id_etudiant) ON DELETE CASCADE,
  id_designe_par    UUID NULL REFERENCES scolarite_staff(id_scolarite) ON DELETE SET NULL,
  date_designation  DATE NOT NULL DEFAULT CURRENT_DATE,
  date_fin_mandat   DATE,
  statut            enum_statut_president NOT NULL DEFAULT 'Actif',
  CHECK (date_fin_mandat IS NULL OR date_fin_mandat >= date_designation)
);
CREATE INDEX idx_president_club_etudiant ON president_club(id_etudiant);

CREATE TABLE demande_club (
  id_demande_club UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_club         UUID NOT NULL REFERENCES club(id_club) ON DELETE CASCADE,
  id_president    UUID NOT NULL REFERENCES president_club(id_president) ON DELETE CASCADE,
  id_traite_par   UUID NULL REFERENCES scolarite_staff(id_scolarite) ON DELETE SET NULL,
  type            enum_type_demande_club NOT NULL,
  objet           VARCHAR(255) NOT NULL,
  description     TEXT,
  date_demande    TIMESTAMPTZ NOT NULL DEFAULT now(),
  statut          enum_statut_demande_club NOT NULL DEFAULT 'Soumise',
  date_evenement  DATE,
  heure_debut     TIME,
  heure_fin       TIME,
  budget_demande  NUMERIC(12,2) CHECK (budget_demande >= 0),
  justificatifs   JSONB
);
CREATE INDEX idx_demande_club_club      ON demande_club(id_club);
CREATE INDEX idx_demande_club_president ON demande_club(id_president);

-- =====================================================================
-- PACKAGE : SMART CAMPUS & SALLES INTELLIGENTES
-- =====================================================================

CREATE TABLE salle (
  id_salle      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero        VARCHAR(30) NOT NULL UNIQUE,
  nom           VARCHAR(150),
  capacite      SMALLINT NOT NULL CHECK (capacite > 0),
  type          enum_type_salle NOT NULL,
  equipements   JSONB,
  localisation  VARCHAR(255),
  statut        enum_statut_salle NOT NULL DEFAULT 'Disponible'
);

CREATE TABLE session_salle (
  id_session          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_salle            UUID NOT NULL REFERENCES salle(id_salle) ON DELETE CASCADE,
  id_cours            UUID NOT NULL REFERENCES cours(id_cours) ON DELETE CASCADE,
  id_professeur       UUID NOT NULL REFERENCES professeur(id_professeur) ON DELETE RESTRICT,
  date                DATE NOT NULL,
  heure_debut         TIME NOT NULL,
  heure_fin           TIME NOT NULL,
  heure_debut_reelle  TIME,
  heure_fin_reelle    TIME,
  statut              enum_statut_session NOT NULL DEFAULT 'Planifiee',
  nombre_etudiants    INTEGER CHECK (nombre_etudiants >= 0),
  retard_moyen        INTEGER CHECK (retard_moyen >= 0),   -- en minutes
  CHECK (heure_fin > heure_debut)
);
CREATE INDEX idx_session_salle_salle      ON session_salle(id_salle);
CREATE INDEX idx_session_salle_cours      ON session_salle(id_cours);
CREATE INDEX idx_session_salle_professeur ON session_salle(id_professeur);
CREATE INDEX idx_session_salle_date       ON session_salle(date);

CREATE TABLE presence_etudiant (
  id_presence             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_session              UUID NOT NULL REFERENCES session_salle(id_session) ON DELETE CASCADE,
  id_etudiant             UUID NOT NULL REFERENCES etudiant(id_etudiant) ON DELETE CASCADE,
  heure_arrivee           TIME,
  heure_depart            TIME,
  statut                  enum_statut_presence NOT NULL DEFAULT 'Absent',
  methode_identification  enum_methode_identification,
  UNIQUE (id_session, id_etudiant)
);
CREATE INDEX idx_presence_session  ON presence_etudiant(id_session);
CREATE INDEX idx_presence_etudiant ON presence_etudiant(id_etudiant);

CREATE TABLE reservation_salle (
  id_reservation  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_salle        UUID NOT NULL REFERENCES salle(id_salle) ON DELETE CASCADE,
  id_demandeur    UUID NOT NULL REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
  date            DATE NOT NULL,
  heure_debut     TIME NOT NULL,
  heure_fin       TIME NOT NULL,
  motif           VARCHAR(255),
  statut          enum_statut_reservation NOT NULL DEFAULT 'Demandee',
  CHECK (heure_fin > heure_debut)
);
CREATE INDEX idx_reservation_salle_salle     ON reservation_salle(id_salle);
CREATE INDEX idx_reservation_salle_demandeur ON reservation_salle(id_demandeur);

CREATE TABLE alerte_ia (
  id_alerte       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_salle        UUID NULL REFERENCES salle(id_salle) ON DELETE SET NULL,
  type            enum_type_alerte NOT NULL,
  description     TEXT,
  date_detection  TIMESTAMPTZ NOT NULL DEFAULT now(),
  statut          enum_statut_alerte NOT NULL DEFAULT 'Nouvelle',
  priorite        enum_priorite NOT NULL DEFAULT 'Normale'
);
CREATE INDEX idx_alerte_ia_salle  ON alerte_ia(id_salle);
CREATE INDEX idx_alerte_ia_statut ON alerte_ia(statut);

-- =====================================================================
-- PACKAGE : MESSAGERIE & NOTIFICATIONS
-- =====================================================================

CREATE TABLE conversation (
  id_conversation UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sujet           VARCHAR(255),
  date_creation   TIMESTAMPTZ NOT NULL DEFAULT now(),
  statut          enum_statut_conversation NOT NULL DEFAULT 'Ouverte'
);

-- Table many-to-many remplaçant la relation directe utilisateur -- conversation
CREATE TABLE conversation_participant (
  id_conversation UUID NOT NULL REFERENCES conversation(id_conversation) ON DELETE CASCADE,
  id_utilisateur  UUID NOT NULL REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
  date_ajout      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id_conversation, id_utilisateur)
);

CREATE TABLE message (
  id_message      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_conversation UUID NOT NULL REFERENCES conversation(id_conversation) ON DELETE CASCADE,
  id_expediteur   UUID NOT NULL REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
  contenu         TEXT NOT NULL,
  date_envoi      TIMESTAMPTZ NOT NULL DEFAULT now(),
  lu              BOOLEAN NOT NULL DEFAULT FALSE,
  pieces_jointes  JSONB
);
CREATE INDEX idx_message_conversation ON message(id_conversation);
CREATE INDEX idx_message_expediteur   ON message(id_expediteur);

CREATE TABLE notification (
  id_notification UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_utilisateur  UUID NOT NULL REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
  titre           VARCHAR(255) NOT NULL,
  message         TEXT NOT NULL,
  type            enum_type_notification NOT NULL,
  date_envoi      TIMESTAMPTZ NOT NULL DEFAULT now(),
  lu              BOOLEAN NOT NULL DEFAULT FALSE,
  priorite        enum_priorite_notification NOT NULL DEFAULT 'Info'
);
CREATE INDEX idx_notification_utilisateur ON notification(id_utilisateur);
CREATE INDEX idx_notification_lu          ON notification(lu);

-- =====================================================================
-- PACKAGE : ASSISTANT IA & CHATBOT
-- =====================================================================

CREATE TABLE base_connaissance (
  id_base   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre     VARCHAR(255) NOT NULL,
  contenu   TEXT NOT NULL,
  categorie VARCHAR(100),
  date_maj  TIMESTAMPTZ NOT NULL DEFAULT now(),
  vecteur   JSONB   -- embedding stocké en JSONB ; pour une vraie recherche vectorielle, installer l'extension pgvector et remplacer par le type VECTOR(n)
);

CREATE TABLE conversation_ia (
  id_conversation_ia  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_etudiant         UUID NOT NULL REFERENCES etudiant(id_etudiant) ON DELETE CASCADE,
  date_creation       TIMESTAMPTZ NOT NULL DEFAULT now(),
  statut              enum_statut_conversation_ia NOT NULL DEFAULT 'Active',
  satisfaction        SMALLINT CHECK (satisfaction BETWEEN 1 AND 5)
);
CREATE INDEX idx_conversation_ia_etudiant ON conversation_ia(id_etudiant);

CREATE TABLE message_ia (
  id_message_ia       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_conversation_ia  UUID NOT NULL REFERENCES conversation_ia(id_conversation_ia) ON DELETE CASCADE,
  id_base             UUID NULL REFERENCES base_connaissance(id_base) ON DELETE SET NULL,
  role                enum_role_message_ia NOT NULL,
  contenu             TEXT NOT NULL,
  date_envoi          TIMESTAMPTZ NOT NULL DEFAULT now(),
  tokens              INTEGER CHECK (tokens >= 0)
);
CREATE INDEX idx_message_ia_conversation ON message_ia(id_conversation_ia);
CREATE INDEX idx_message_ia_base         ON message_ia(id_base);

-- =====================================================================
-- PACKAGE : AUDIT & TRAÇABILITÉ
-- =====================================================================

CREATE TABLE audit_log (
  id_log          BIGSERIAL PRIMARY KEY,   -- volumétrie élevée attendue : clé séquentielle plus légère qu'un UUID
  id_utilisateur  UUID NULL REFERENCES utilisateur(id_utilisateur) ON DELETE SET NULL,
  action          VARCHAR(100) NOT NULL,
  module          VARCHAR(100) NOT NULL,
  entite          VARCHAR(100) NOT NULL,
  entite_id       UUID,
  date_action     TIMESTAMPTZ NOT NULL DEFAULT now(),
  adresse_ip      INET,   -- type natif PostgreSQL, compatible IPv4 et IPv6
  user_agent      VARCHAR(500),
  donnees_avant   JSONB,
  donnees_apres   JSONB
);
CREATE INDEX idx_audit_log_utilisateur ON audit_log(id_utilisateur);
CREATE INDEX idx_audit_log_entite      ON audit_log(entite, entite_id);
CREATE INDEX idx_audit_log_date        ON audit_log(date_action);

-- =====================================================================
-- PACKAGE : CONFIGURATION SYSTÈME
-- =====================================================================

CREATE TABLE parametre_systeme (
  id_parametre  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cle           VARCHAR(150) NOT NULL UNIQUE,
  valeur        TEXT,
  type          enum_type_parametre NOT NULL DEFAULT 'String',
  description   TEXT,
  module        VARCHAR(100)
);

CREATE TABLE calendrier_academique (
  id_calendrier   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom             VARCHAR(150) NOT NULL,
  annee_scolaire  VARCHAR(20) NOT NULL UNIQUE,
  date_debut      DATE NOT NULL,
  date_fin        DATE NOT NULL,
  periodes        JSONB,
  CHECK (date_fin >= date_debut)
);

-- =====================================================================
-- FIN DU SCRIPT
-- =====================================================================
-- Pré-requis : PostgreSQL 14+ recommandé. L'extension pgcrypto (pour
-- gen_random_uuid()) est incluse en standard dans les distributions
-- PostgreSQL officielles ; si elle n'est pas disponible, utiliser
-- l'extension "uuid-ossp" et uuid_generate_v4() à la place.
-- =====================================================================