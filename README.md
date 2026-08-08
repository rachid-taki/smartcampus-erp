🎓 SmartCampus ERP - Module 5 : Portail Scolarité
Ce module constitue le cœur administratif du système SmartCampus ERP. Il est destiné au personnel de la scolarité et permet la gestion centralisée des demandes étudiantes, des workflows de validation, ainsi que la génération et la signature sécurisée de documents officiels.

🛠️ Stack Technique
Frontend : React.js, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts.

Backend : Node.js, Express.js.

Base de Données : PostgreSQL.

ORM : Prisma Client.

Génération PDF : pdfkit.

Sécurité & Cryptographie : Module natif Node.js crypto (SHA-256).

✨ Fonctionnalités Principales
1. 📊 Tableau de Bord (Dashboard)
Visualisation des KPIs (Demandes en attente, Réclamations traitées, Certificats validés).

Graphiques dynamiques (répartition par statut, volume mensuel) via recharts.

2. ✅ Validation des Demandes
Interface sous forme de tableau interactif listant les requêtes étudiantes.

Possibilité de visualiser, traiter (accepter/rejeter) et ajouter des commentaires.

Intégration fluide avec le backend pour mettre à jour les statuts en temps réel.

3. ⚙️ Gestion des Workflows
Configuration des étapes de validation pour les processus complexes.

Possibilité d'activer ou de désactiver des workflows (ex: Changement de filière, Demande de bourse).

4. 📂 Base Documentaire Séparée (Dual-Table Architecture)
L'architecture de la gestion documentaire a été pensée pour les standards "Enterprise", séparant les fichiers soumis des documents officiels.

📁 Documents Soumis (Étudiants) : Fichiers externes (certificats médicaux, CIN) gérés via des URLs cloud.

🏛️ Documents Officiels (Administration) :

Génération On-The-Fly : Génération de PDF (Attestations) côté serveur via pdfkit.

Stockage Sécurisé : Les PDF officiels sont sauvegardés directement dans PostgreSQL au format binaire (BYTEA / Buffer).

Téléchargement Direct : Le frontend télécharge et reconstitue les fichiers binaires via le navigateur.

5. ✍️ Signature Électronique
Sceau cryptographique (Hash SHA-256) généré à partir de l'ID du document, du nom, du timestamp et de l'ID de l'employé.

Prévention de la double signature et affichage d'un badge de validation visuelle (Sceau vert "Signé") sur l'interface.

6. 🎨 Layout SaaS Premium
Un ScolariteLayout global intégrant une barre de navigation latérale (Sidebar) et un Header moderne pour une expérience utilisateur professionnelle.

🗄️ Architecture de la Base de Données (Prisma)
Mise à jour majeure du schéma Prisma avec la création de la table sécurisée pour les documents officiels :

Code snippet
model document_officiel {
  id_document_officiel   String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  id_demande             String?   @db.Uuid
  id_etudiant            String    @db.Uuid
  nom                    String    @db.VarChar(255)
  type                   String?   @db.VarChar(100)
  categorie              String?   @db.VarChar(50)
  contenu                Bytes     // Stockage binaire direct (BYTEA)
  taille                 Int
  hash                   String?   @db.VarChar(128) // Signature cryptographique
  date_generation        DateTime  @default(now()) @db.Timestamptz(6)
  date_expiration        DateTime? @db.Date
  nombre_telechargements Int       @default(0)
  dernier_telechargement DateTime? @db.Timestamptz(6)

  demande  Demande? @relation(fields: [id_demande], references: [id_demande], onDelete: SetNull)
  etudiant Etudiant @relation(fields: [id_etudiant], references: [id_etudiant], onDelete: Cascade)
}
🚀 Comment lancer le module
1. Base de données (Backend)

Assurez-vous que PostgreSQL est en cours d'exécution.

Générez le client Prisma : npx prisma generate

Lancez le serveur Node.js : node src/server.js (ou npm run dev)

2. Interface (Frontend)

Lancez le serveur Vite : npm run dev

Accédez à http://localhost:5173 dans votre navigateur.