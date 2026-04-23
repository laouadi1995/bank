# NoxaBank

NoxaBank est une application bancaire full-stack développée dans le cadre d’un projet académique.  
Elle permet de gérer des comptes bancaires, effectuer des dépôts, transferts et consulter les soldes.

Le projet est composé de deux parties principales :

- **Backend API** : ASP.NET Core Web API + Entity Framework Core + SQL Server
- **Frontend** : React (Vite)


NoxaBank - Guide d'installation et d'exécution

-------------Prérequis----------------
• Visual Studio 2022 (ASP.NET Core)
• Node.js (version 18 ou plus)
• SQL Server Express
• SQL Server Management Studio (optionnel)


- Configuration de la base de données:
  
1. Créer une base de données nommée NoxaBankDb dans SQL Server.
2. Modifier la chaîne de connexion dans appsettings.json :
Server=VOTRE_NOM\SQLEXPRESS;Database=NoxaBankDb;Trusted_Connection=True;

(server=VOTRE_NOM) tu dois changer just ca pas plus S.V.P
3. Appliquer les migrations avec la commande : 1. dotnet ef migrations add data || 2. dotnet ef database update
   
- Lancer le Backend
• Ouvrir le dossier NoxaBank.Api
• Exécuter : dotnet run
• Backend : http://localhost:5200

- Lancer le Frontend -
• Ouvrir le dossier frontend
• npm install
• npm run dev
• Frontend : http://localhost:5173

Compte Administrateur
• Email : noxabank@gmail.com
• Mot de passe : noxa2026

- Fonctionnalités
• Login sécurisé (JWT)
• Dépôt par chèque
• Transfert (client ou interne)
• Update profil
• Historique transactions

--------Remarques trés important S.V.P---------------
• Lancer backend avant frontend
• Vérifier SQL Server actif
• Port backend : 5200
• CORS : http://localhost:5173

Résumé
• Installer outils
• Configurer DB
• Lancer backend
• Lancer frontend
