# Cartographie — poufiret-admin

> Document généré à partir du code réel du dépôt (aucune supposition non vérifiée). Toutes les routes/endpoints cités sont extraits littéralement des fichiers source. Backend Django/DRF, base `/api/v1/`.

---

## 1. Structure globale

### 1.1 Arborescence de `src/app/`

```
src/app/
├── app.ts, app.html, app.scss, app.routes.ts, app.config.ts   # racine : <router-outlet> seul, providers globaux
├── noyau/                                    # services transverses, guards, config
│   ├── auth/
│   │   ├── auth.service.ts                   # session, tokens, /auth/moi/, /auth/connexion/, /auth/pin/changer/
│   │   ├── auth.interceptor.ts                # pose Authorization, gère le refresh sur 401
│   │   ├── auth.guard.ts                      # authGuard (connecté ?)
│   │   ├── role.guard.ts                      # roleGuard(rôles[])
│   │   ├── redirection-racine.guard.ts         # écarte les espaces hors admin/partenaire de la coquille
│   │   └── route-par-espace.ts                 # espace -> route racine (fonction pure partagée)
│   ├── permissions/
│   │   ├── permissions.service.ts              # GET /administration/mes-permissions/, cache
│   │   ├── capacite.guard.ts                   # vérifie route.data.capacite
│   │   ├── super-admin.guard.ts                # is_superuser uniquement
│   │   └── gestion-admins.guard.ts             # is_superuser OU capacité gerer_admins
│   ├── config/
│   │   └── configuration.service.ts            # expose apiUrl/production depuis environment
│   └── notifications/
│       └── detecteur-compteur.ts               # moteur générique de polling « compteur qui augmente »
├── fonctionnalites/
│   ├── authentification/connexion/             # écran de connexion (public)
│   ├── tableau-de-bord/                        # aiguilleur : délègue à TableauDeBordPartenaire ou TableauDeBordAdmin selon le rôle
│   ├── espace-mobile/                          # page « pas d'accès web » (client/livreur)
│   ├── administration/                         # espace admin/super-admin (16 sous-dossiers, détail §3)
│   ├── partenaire/                              # espace partenaire (8 sous-dossiers, détail §3)
│   └── livraison/                               # espace TeneLivr, isolé (détail §3)
├── partage/                                     # composants réutilisés entre espaces
│   ├── mise-en-page/
│   │   ├── coquille-application/                # layout admin+partenaire (en-tête + menu + <router-outlet>)
│   │   ├── en-tete/                             # en-tête admin/partenaire
│   │   ├── barre-laterale/                      # menu latéral admin/partenaire
│   │   └── cloche-notifications/                # cloche de notification (commandes partenaire), voir §7
│   ├── mon-compte/
│   │   ├── carte-mon-compte/                    # carte « Mon compte » partagée (partenaire + admin)
│   │   └── dialogue-changer-pin/                # dialog de changement de PIN, partagé
│   └── graphique/                               # wrapper Chart.js réutilisé par tous les écrans de stats
└── modeles/                                     # interfaces TypeScript miroir du contrat backend (détail §6)
```

Le module `fonctionnalites/livraison/` est **volontairement isolé** : ses propres `modeles/`, son propre `ecran-a-venir-livraison`, sa propre en-tête/barre latérale, aucune dépendance vers `fonctionnalites/administration/` ni `partage/mise-en-page/` — objectif explicite (commentaires du code) : rester extractible vers un projet TeneLivr autonome.

### 1.2 Version Angular, standalone, lazy-loading

- **Angular 20.3.0** (`@angular/core`, `@angular/common`, `@angular/router`, etc. — `package.json`), CLI `20.3.9`, TypeScript `~5.9.2`.
- **100% standalone components** : aucun `NgModule` dans le code applicatif ; bootstrap via `bootstrapApplication(App, appConfig)` (`src/main.ts`).
- **Lazy-loading systématique** : chaque route de `app.routes.ts` utilise `loadComponent: () => import(...).then(...)`, y compris les enfants (aucune route ne charge son composant de façon statique). Confirmé par le build (`npx ng build`) qui produit un chunk séparé par écran (ex. `mes-commandes`, `publicites`, `gestion-admins`, `mon-profil-admin`, etc.).
- **Autres dépendances runtime** : `@angular/cdk` (drag-drop, utilisé uniquement dans la réorganisation d'images de `mes-produits`), `chart.js`, `leaflet`, `@angular/service-worker`. **Pas d'Angular Material** installé (absent de `package.json`) malgré des mentions dans certains prompts historiques — tous les écrans utilisent du HTML/CSS natif.

### 1.3 Fichiers d'environnement

- `src/environments/environment.ts` (prod) et `environment.development.ts` (dev) : mêmes clés dans les deux —
  - `production: boolean`
  - `apiUrl: string` → actuellement `https://poufiret.tenelo.cloud/api/v1` dans les deux fichiers (pas de backend local ; le dev pointe sur le backend distant).
- Aucun secret dans ces fichiers (pas de clé API, pas de token).
- `angular.json` : `fileReplacements` bascule `environment.ts` → `environment.development.ts` en configuration `development`.

---

## 2. Routage & espaces

### 2.1 Routes de premier niveau (`app.routes.ts`)

| Path | Guards | Composant | Rôle |
|---|---|---|---|
| `/connexion` | — (public) | `Connexion` | Formulaire téléphone + PIN |
| `` (racine) | `authGuard`, `redirectionRacineGuard` | `CoquilleApplication` (children ci-dessous) | Coquille admin + partenaire |
| `/espace-mobile` | `authGuard` | `EspaceMobile` | Message « pas d'accès web » (client/livreur) |
| `/livraison` | `authGuard`, `livraisonGuard` | `LayoutLivraison` (children ci-dessous) | Espace TeneLivr (coordonnateur/superviseur/gestionnaire) |
| `**` | — | redirect | → `/connexion` |

### 2.2 Aiguillage par `espace`

Le champ `espace` de `Utilisateur` (renvoyé par `/auth/connexion/` et `/auth/moi/`) pilote la redirection post-connexion et les guards, via la fonction pure `routeParEspace()` (`noyau/auth/route-par-espace.ts`) :

| `espace` | Route racine |
|---|---|
| `coordination_livraison` | `/livraison/coordonnateur` |
| `supervision_livraison` | `/livraison/superviseur` |
| `gestion_livraison` | `/livraison/gestionnaire` |
| `client`, `livreur` | `/espace-mobile` |
| `super_admin`, `admin`, `partenaire`, absent/inconnu | `/tableau-de-bord` |

- **`redirectionRacineGuard`** (posé sur la coquille `''`) : laisse passer si `espace` est absent, `admin`, `super_admin` ou `partenaire` ; sinon redirige via `routeParEspace()` (écarte TeneLivr/mobile-only de la coquille admin).
- **`livraisonGuard`** (posé sur `/livraison`) : n'autorise que les 3 espaces livraison (via `niveauDepuisEspace()`), sinon redirige via `routeParEspace()`.
- Le super-admin n'a **pas** de valeur `espace` dédiée distincte de `admin` — la distinction super-admin/admin simple se fait uniquement via `is_superuser` (renvoyé par `/administration/mes-permissions/`, voir §5), pas via `espace`.

### 2.3 Layout, menu et routes par espace

| Espace | Layout | Menu (composant) | Racine |
|---|---|---|---|
| `admin` / `super_admin` | `CoquilleApplication` (en-tête + `BarreLaterale`) | `BarreLaterale`, liste `ENTREES_ADMIN` filtrée par capacité | `/tableau-de-bord` |
| `partenaire` | `CoquilleApplication` (même layout, menu différent) | `BarreLaterale`, liste `ENTREES_PARTENAIRE` (fixe, pas de filtrage) | `/tableau-de-bord` |
| `coordination_livraison` | `LayoutLivraison` (`EnTeteLivraison` + `BarreLateraleLivraison`) | `BarreLateraleLivraison`, entrées du niveau `coordonnateur` | `/livraison/coordonnateur` |
| `supervision_livraison` | `LayoutLivraison` | entrées du niveau `superviseur` | `/livraison/superviseur` |
| `gestion_livraison` | `LayoutLivraison` | entrées du niveau `gestionnaire` | `/livraison/gestionnaire` |
| `client`, `livreur` | aucun (page seule) | — | `/espace-mobile` |

**Menu partenaire** (`ENTREES_PARTENAIRE`, fixe) : Tableau de bord, Mon profil, Mes catégories, Mes produits, Mes commandes, Publicités.

**Menu admin** (`ENTREES_ADMIN`, filtré) : chaque entrée déclare soit une `capacite` (affichée si `permissions.capacites[capacite]`), soit `toujoursVisible: true` (affichée à tout admin, ex. Mon profil), soit ni l'un ni l'autre (réservée au super-admin, ex. Modération de comptes). Détail capacité→écran en §3.3/§5.

**Menu TeneLivr** (`BarreLateraleLivraison`) — 4 entrées par niveau, dérivées de `niveauDepuisEspace(espace)` (pas des capacités admin Poufiret) :
- **coordonnateur** : Vue d'ensemble (`/livraison/coordonnateur`), Toutes les villes (`/villes`), Comptes livraison (`/comptes`), Statistiques (`/statistiques`).
- **superviseur** : Ma ville (`/livraison/superviseur`), Carte (`/carte`), Comptes de ma ville (`/comptes`), Statistiques (`/statistiques`).
- **gestionnaire** : Courses (`/livraison/gestionnaire`), Carte (`/carte`), Livreurs (`/livreurs`), Statistiques (`/statistiques`).

---

## 3. Modules fonctionnels par espace

### 3.1 Espace partenaire (`roleGuard(['partenaire'])` sur chaque route)

| Composant | Route | Guard | But | Endpoints |
|---|---|---|---|---|
| `TableauDeBord` → `TableauDeBordPartenaire` | `/tableau-de-bord` | `roleGuard(['partenaire'])` | 3 onglets (ensemble/produits/commandes) agrégés en front | `GET /catalogue/partenaire/stats-vues/` + réutilise les services ci-dessous (profil, articles paginés, catégories, commandes) |
| `MonProfil` (+ `CarteMonCompte` partagée) | `/mon-profil` | `roleGuard(['partenaire'])` | Vitrine (lecture/édition) + identité du compte + PIN | `GET/PATCH /auth/mon-profil-partenaire/`, `GET /geo/departements/`, `GET/PATCH /auth/moi/`, `POST /auth/pin/changer/` |
| `MesCategories` | `/mes-categories` | `roleGuard(['partenaire'])` | Choix des catégories globales du partenaire | `GET/POST /auth/mes-categories/`, `DELETE/PATCH /auth/mes-categories/<id>/`, `GET /catalogue/categories/` |
| `MesProduits` (+ `FormulaireArticle`, `GestionImages`) | `/mes-produits` | `roleGuard(['partenaire'])` | CRUD articles, regroupés par catégorie, gestion images (drag-drop ordre, image principale) | `GET/POST/PATCH/DELETE /catalogue/articles/[<slug>/]`, `GET /catalogue/categories/`, `GET/POST/DELETE/PATCH /catalogue/images/[<pk>/]` |
| `MesCommandes` (+ `DetailCommande`) | `/mes-commandes` | `roleGuard(['partenaire'])` | Suivi (colonnes par statut) + historique + vue tableau par récap, auto-refresh 20s | `GET /orders/commandes/partenaire/` (paginé), `GET /orders/commandes/partenaire/resume/`, `GET /orders/commandes/<id>/`, `POST /orders/commandes/<id>/transition/`, `POST /orders/commandes/<id>/livreur/` |
| `Publicites` (3 onglets) | `/publicites` | `roleGuard(['partenaire'])` | Formules disponibles, gestion de mes campagnes, points/stats | voir sous-tableau ci-dessous |

**Onglets `Publicites`** :

| Onglet | But | Endpoints |
|---|---|---|
| `OngletFormulesDisponibles` | Catalogue pédagogique des formules | `GET /publicites/formules/` |
| `OngletGestionPublicites` (+ `DialogDetailPublicite`, `DialogReconduction`, `FormulaireCreationPublicite`, `AfficheFormules`) | Création/soumission/reconduction/modif image/masquage de mes campagnes | `GET /publicites/formules/`, `GET/POST /publicites/mes-publicites/`, `POST /publicites/<id>/transition/soumettre/`, `POST /publicites/mes-publicites/<id>/reconduire/`, `POST /publicites/mes-publicites/<id>/image/`, `POST /publicites/mes-publicites/<id>/masquer/` |
| `OngletPointsPublicites` | Stats par campagne (impressions/clics/cible) + masquage | `GET /publicites/mes-stats/`, `POST /publicites/mes-publicites/<id>/masquer/` |

### 3.2 Espace TeneLivr (`fonctionnalites/livraison/`, `livraisonGuard`)

| Composant | Route(s) | But | Endpoints |
|---|---|---|---|
| `CarteCoordonnateur` (habillage de `CarteLivreurs`) | `/livraison/coordonnateur` | Carte Leaflet temps réel multi-villes | `GET /livraison/coordonnateur/courses/`, `GET /livraison/coordonnateur/livreurs/`, `GET /geo/departements/` (sélecteur ville) |
| `DispatchingCoordonnateur` (habillage de `DispatchingGestionnaire`) | `/livraison/coordonnateur/villes` | Dispatching multi-villes (pas de création de course) | `GET /livraison/coordonnateur/courses/`, `GET /livraison/coordonnateur/livreurs/`, `POST /livraison/coordonnateur/courses/<id>/assigner/` |
| `GestionComptesCoordonnateur` | `/livraison/coordonnateur/comptes` | CRUD superviseurs/gestionnaires/livreurs par ville | `GET/POST/DELETE /livraison/comptes/superviseurs/[<id>/]`, `GET/POST/DELETE /livraison/comptes/gestionnaires/[<id>/]`, `GET/POST/DELETE /livraison/comptes/livreurs/[<id>/]`, `GET /geo/departements/` |
| `EcranStatsCoordonnateur` (habillage de `StatsLivraison`, mode `coordonnateur`) | `/livraison/coordonnateur/statistiques` | Stats nationales filtrables par ville | `GET /livraison/stats/coordonnateur/` |
| `EcranAVenirLivraison` (titre « Ma ville ») | `/livraison/superviseur` | **Placeholder** | — |
| `CarteLivreurs` | `/livraison/superviseur/carte`, `/livraison/gestionnaire/carte` | Carte Leaflet (polling 8s), sélecteur fond de carte Standard/Satellite | `GET /livraison/bureau/courses/`, `GET /livraison/bureau/livreurs/` |
| `EcranAVenirLivraison` (titre « Comptes de ma ville ») | `/livraison/superviseur/comptes` | **Placeholder** | — |
| `EcranStatsBureau` (habillage de `StatsLivraison`, mode `complet`) | `/livraison/superviseur/statistiques` | Stats ville, mode complet | `GET /livraison/stats/bureau/` |
| `DispatchingGestionnaire` (+ `DialogAssignation`, `DialogCreationCourse`) | `/livraison/gestionnaire` | Poste de dispatching : courses + livreurs de la ville, assignation, création de course | `GET /livraison/bureau/courses/`, `GET /livraison/bureau/livreurs/`, `POST /livraison/bureau/courses/<id>/assigner/`, `POST /livraison/bureau/courses/creer/` |
| `EcranAVenirLivraison` (titre « Livreurs ») | `/livraison/gestionnaire/livreurs` | **Placeholder** | — |
| `EcranStatsBureau` (mode `allege`) | `/livraison/gestionnaire/statistiques` | Stats ville, mode allégé (KPI essentiels) | `GET /livraison/stats/bureau/` |

`DispatchingGestionnaire` et `CarteLivreurs` sont **factorisés** via l'interface `SourceDispatchingLivraison` (source de données + endpoint d'assignation paramétrables), réutilisés tels quels par le coordonnateur (multi-villes) sans duplication de code. `StatsLivraison` est de même un composant unique piloté par `ModeAffichageStats` (`allege` | `complet` | `coordonnateur`).

### 3.3 Espace admin / super-admin (`fonctionnalites/administration/`, préfixe de route `/administration/...` sauf `mon-profil`)

| Composant | Route | Guard (capacité/rôle) | But | Endpoints |
|---|---|---|---|---|
| `TableauDeBord` → `TableauDeBordAdmin` | `/tableau-de-bord` | `roleGuard(['admin'])` (implicite, coquille) | Activité comptes/connexions/appareils (pas la livraison) | `GET /administration/dashboard/` |
| `MonProfilAdmin` (+ `CarteMonCompte` partagée) | `/administration/mon-profil` | `roleGuard(['admin'])` — commun admin+super-admin, pas de capacité | Identité du compte + PIN + section « Mes droits » (lecture seule, admin simple uniquement) | `GET/PATCH /auth/moi/`, `POST /auth/pin/changer/`, `GET /administration/mes-permissions/` |
| `IndicateursPartenairesComponent` | `/administration/indicateurs-partenaires` | `capaciteGuard` → `voir_indicateurs` | Vue d'ensemble partenaires (répartitions, expirations) + export CSV | `GET /administration/partenaires/`, `GET /administration/partenaires/export/` |
| `DemandesPartenariat` | `/administration/demandes-partenariat` | `capaciteGuard` → `valider_devenir_partenaire` | File d'attente des demandes en attente, accepter/rejeter | `GET/POST /administration/demandes-partenariat/` |
| `JournalAudit` | `/administration/journal` | `capaciteGuard` → `lire_journal` | Historique des actions de modération (200 dernières), filtrage/pagination client, export CSV | `GET /administration/moderation/journal/`, `GET /administration/moderation/journal/export/` |
| `EngagementClientsComponent` | `/administration/engagement-clients` | `capaciteGuard` → `voir_stats` | Engagement clients (temps passé, articles vus), triable, top catégories | `GET /analytics/admin/engagement/` |
| `StatsConnexionComponent` | `/administration/stats-connexion` | `capaciteGuard` → `voir_stats` | Résumé connexions/ouvertures + export CSV détaillé des sessions | `GET /analytics/admin/stats-connexion/`, `GET /analytics/admin/stats-connexion/export/` |
| `PublicitesAdmin` | `/administration/publicites` | `capaciteGuard` → `voir_stats` | Supervision campagnes toutes formules, transitions (confirmer paiement/valider/rejeter/terminer), export CSV | `GET /publicites/admin/stats/`, `POST /publicites/<id>/transition/<action>/`, `GET /publicites/admin/export/` |
| `CreditsPub` | `/administration/credits-pub` | `capaciteGuard` → `offrir_campagne` | Recherche partenaire puis octroi/retrait de crédits de formule pub | `GET /administration/partenaires/recherche/`, `GET/POST /administration/partenaires/<pk>/credits/`, `DELETE /administration/credits/<uuid>/`, `GET /publicites/formules/` |
| `FaveurPlan` | `/administration/faveur-plan` | `capaciteGuard` → `accorder_faveur` | Recherche partenaire puis octroi/retrait gratuit d'un plan (4 plans fixes en dur côté front) | `POST/DELETE /administration/partenaires/<pk>/faveur/`, (recherche via le service partagé `recherche-partenaires.service.ts`) |
| `CreationPartenaire` | `/administration/creer-partenaire` | `capaciteGuard` → `creer_partenaire` | Formulaire de création complète d'un partenaire (compte + profil actif) | `POST /auth/partenaires/creer/`, `GET /geo/departements/`, `GET /catalogue/categories/` |
| `Moderation` (réservé super-admin) | `/administration/moderation` | `superAdminGuard` | Recherche de comptes puis suspendre/bannir/supprimer(soft|hard)/restaurer, garde-fous selon gravité | `GET /administration/comptes/recherche/`, `POST /administration/moderation/` |
| `EcranAVenir` (titre « Paiements ») | `/administration/paiements` | `capaciteGuard` → `voir_stats` | **Placeholder** (« Module de paiement — bientôt disponible ») | — |
| `GestionAdmins` (+ `CreerAdmin`, `EditerCapacites`, `SelecteurCapacites`) | `/administration/gestion-admins` | `gestionAdminsGuard` (super-admin OU capacité `gerer_admins`) | Liste des comptes admin, création, édition des 33 capacités, révocation | `GET/POST /administration/admins/[creer/]`, `GET/PATCH/DELETE /administration/admins/<id>/` |
| `AccesRefuse` | `/acces-refuse` | — | Page affichée par `capaciteGuard`/`superAdminGuard`/`gestionAdminsGuard` en cas de refus | — |

---

## 4. Services (`noyau/`)

### 4.1 `AuthService` (`noyau/auth/auth.service.ts`)

- **Stockage** : `localStorage`, 3 clés — `poufiret_admin_access`, `poufiret_admin_refresh`, `poufiret_admin_utilisateur` (JSON de l'objet `Utilisateur` mappé).
- **État exposé** : signal `utilisateur` (lu depuis `localStorage` à l'instanciation), `estConnecte` (computed), `role` (computed).
- **Méthodes réseau** :
  - `connexion(telephone, pin)` → `POST /auth/connexion/` `{telephone, password}` (le PIN est envoyé dans le champ `password`) → enregistre la session complète.
  - `rafraichirUtilisateur()` → `GET /auth/moi/` → met à jour le cache local (best-effort, n'affecte pas les tokens). Appelé au chargement de `CoquilleApplication` et `LayoutLivraison`.
  - `mettreAJourMonProfil(payload)` → `PATCH /auth/moi/` `{username?, first_name, last_name, email}` → même mise à jour de cache.
  - `changerPin(ancien, nouveau)` → `POST /auth/pin/changer/` `{ancien_pin, nouveau_pin}` → réponse `{access, refresh, utilisateur}`, **remplace access+refresh** (comme à la connexion, via `enregistrerSession`).
  - `rafraichirJeton()` → `POST /auth/rafraichir/` `{refresh}` → remplace `access` (et `refresh` si renvoyé).
  - `deconnexion()` → efface la session + réinitialise `PermissionsService`, redirige vers `/connexion`.

### 4.2 Intercepteur JWT (`noyau/auth/auth.interceptor.ts`, `authInterceptor`)

- Fonctionnel (`HttpInterceptorFn`), enregistré dans `app.config.ts` via `provideHttpClient(withInterceptors([authInterceptor]))`.
- N'agit que sur les requêtes dont l'URL commence par `configuration.apiUrl` ; laisse passer `/auth/connexion/` et `/auth/rafraichir/` sans header (`CHEMINS_PUBLICS`).
- Pose `Authorization: Bearer <access>` si un token existe.
- Sur `401` : si pas de refresh token → déconnexion immédiate. Sinon, déclenche `rafraichirJeton()` puis rejoue la requête originale avec le nouveau token. Verrou partagé (`rafraichissementEnCours` + `Subject rafraichissementTermine$`) pour qu'**une seule requête de refresh** parte même si plusieurs requêtes échouent en 401 simultanément (équivalent d'un queued interceptor) ; les autres requêtes en attente rejouent avec le token une fois le refresh terminé. Si le refresh échoue → déconnexion.

### 4.3 `ConfigurationService` (`noyau/config/configuration.service.ts`)

Wrapper trivial : `apiUrl` et `production` lus depuis `environment` au démarrage, injectés partout ailleurs (aucun service n'importe `environment` directement).

### 4.4 Notification/polling

| Fichier | Intervalle | Endpoint | Son |
|---|---|---|---|
| `noyau/notifications/detecteur-compteur.ts` (`DetecteurCompteur<T>`) | paramétrable (`intervalleMs`) | paramétrable (`charger: () => Observable<T>`) | — (moteur générique, pas de son) |
| `partage/mise-en-page/cloche-notifications/cloche-notifications.ts` (seul usage actuel) | **10000 ms** (`INTERVALLE_POLLING_MS`) | `GET /orders/commandes/partenaire/resume/` (via `MesCommandesService.resume()`), champ observé : `nouvelles` | `public/sons/notification.wav`, joué uniquement après une 1ère interaction utilisateur (`pointerdown`/`keydown`), jamais au tout premier chargement (pas de hausse détectée tant que `compteurPrecedent` est `null`) |

`DetecteurCompteur` est fourni **par composant** (`providers: [DetecteurCompteur]`, pas `providedIn: 'root'`) pour que chaque usage ait son propre état de polling indépendant — actuellement un seul consommateur (la cloche partenaire), conçu pour être réutilisé côté livraison (« courses entrantes »), pas encore fait (voir §7-§8).

### 4.5 Autres services transverses

- `partage/graphique/graphique.ts` (`Graphique`) : wrapper Chart.js générique, réutilisé par tous les écrans de statistiques (partenaire, admin, TeneLivr) — reçoit une `ChartConfiguration` en entrée, aucune logique métier.
- `fonctionnalites/administration/recherche-partenaires.service.ts` : `GET /administration/partenaires/recherche/?q=`, partagé par `CreditsPub` et `FaveurPlan`.
- `fonctionnalites/administration/telecharger-fichier.ts` : utilitaire de déclenchement de téléchargement (blob → lien `<a download>` synthétique), utilisé par tous les exports CSV admin.
- `fonctionnalites/administration/tableau-de-bord-admin/extraire-message-erreur.ts` et `palette-graphiques.ts` : helpers réutilisés par plusieurs écrans admin (messages d'erreur HTTP formatés, palette de couleurs Chart.js cohérente).
- `fonctionnalites/partenaire/mes-produits/extraire-message-erreur.ts` : même rôle, réutilisé cross-feature côté partenaire (mes-commandes, mes-categories, publicites, mon-profil, `partage/mon-compte/*`).
- `fonctionnalites/livraison/extraire-message-erreur-livraison.ts` et `formatage-livraison.ts` : copies locales isolées côté TeneLivr (formatage FCFA, date relative, lien `tel:`), volontairement non partagées avec le reste de l'app.

---

## 5. Gardes & permissions

| Guard | Fichier | Vérifie |
|---|---|---|
| `authGuard` | `noyau/auth/auth.guard.ts` | `authService.estConnecte()` ; sinon redirige `/connexion` |
| `roleGuard(rôles[])` | `noyau/auth/role.guard.ts` | `authService.role()` ∈ `rôles` ; sinon redirige `/connexion` |
| `redirectionRacineGuard` | `noyau/auth/redirection-racine.guard.ts` | `espace` ∈ {absent, `admin`, `super_admin`, `partenaire`} ; sinon redirige vers `routeParEspace(espace)` |
| `livraisonGuard` | `fonctionnalites/livraison/livraison.guard.ts` | `espace` correspond à un niveau TeneLivr (`niveauDepuisEspace`) ; sinon redirige vers `routeParEspace(espace)` |
| `capaciteGuard` | `noyau/permissions/capacite.guard.ts` | `route.data['capacite']` présent dans `permissions.capacites` (charge les permissions si besoin) ; sinon `/acces-refuse`. Route sans `data.capacite` = laissée ouverte |
| `superAdminGuard` | `noyau/permissions/super-admin.guard.ts` | `permissions.isSuperuser === true` ; sinon `/acces-refuse` |
| `gestionAdminsGuard` | `noyau/permissions/gestion-admins.guard.ts` | `isSuperuser \|\| capacites['gerer_admins']` ; sinon `/acces-refuse` |

### Pilotage par les capacités (`GET /administration/mes-permissions/` → `{role, is_staff, is_superuser, capacites: {...}}`)

- Chargées et mises en cache par `PermissionsService` (`shareReplay(1)`, une seule requête en vol même si plusieurs guards/composants la déclenchent en même temps). Déclenchement initial dans `CoquilleApplication.ngOnInit()` **uniquement si `role() === 'admin'`**.
- **Menu** (`BarreLaterale.entreesAdmin`) : chaque entrée avec `capacite` n'apparaît que si `capacites[capacite] === true` ; une entrée `toujoursVisible: true` (ex. Mon profil) apparaît toujours ; une entrée sans `capacite` ni `toujoursVisible` (ex. Modération) n'apparaît que si `isSuperuser`.
- **Routes** : `capaciteGuard` lit `route.data.capacite` (déclaré route par route dans `app.routes.ts`) ; `superAdminGuard`/`gestionAdminsGuard` n'ont pas besoin de `data`.
- Le backend renvoie déjà toutes les capacités à `true` pour un `is_superuser` (règle non recodée côté front, cf. commentaires du modèle).
- 33 capacités possibles (`NomCapacite`, `modeles/permissions-admin.model.ts`), regroupées visuellement en 8 groupes dans `GROUPES_CAPACITES` (`modeles/gestion-admins.model.ts`) pour l'écran de création/édition d'admin — liste exhaustive au §8 (gap : plusieurs capacités n'ont aucun écran qui les consomme).

---

## 6. Modèles (`modeles/`)

| Fichier | Interfaces / types principaux | Champs clés |
|---|---|---|
| `utilisateur.model.ts` | `Utilisateur`, `UtilisateurBrut`, `RoleUtilisateur`, `EspaceUtilisateur`, `RequeteMiseAJourMonProfil` | `id, telephone, first_name?, last_name?, email?, role, est_verifie, pin_par_defaut, langue_preferee, token_fcm?, departement?, departement_nom?, region_nom?, espace?, livraisonDepartementId?/Nom?, livraisonNomBureau?` — **pas de `username`** (retiré, backend ne le renvoie plus) |
| `auth.model.ts` | `RequeteConnexion`, `ReponseConnexion`, `ReponseRafraichissement`, `ReponsePin` | `{telephone,password}`, `{access,refresh,utilisateur}` |
| `permissions-admin.model.ts` | `NomCapacite` (33 valeurs), `ReponsePermissionsAdmin`, `PermissionsAdmin`, `LIBELLES_CAPACITE` | `{role, is_staff/isStaff, is_superuser/isSuperuser, capacites: Record<string,boolean>}` |
| `commande.model.ts` | `Commande`, `LigneCommande`, `StatutCommande`, `ModeLivraisonCommande`, `ModePaiementCommande`, `FiltresCommandesPartenaire`, `FiltresPeriode`, `ResumeCommandes`, `TRANSITIONS_PARTENAIRE` | `id, numero, client_nom/telephone, statut, sous_total/frais_livraison/total, lignes[], created_at, acceptee_le/prete_le/livree_le` ; résumé : `{nouvelles, en_preparation, acceptees, total_aujourdhui, total, ca}` |
| `publicite.model.ts` | `FormulePublicite`, `MaPublicite`, `StatutPublicite`, `TypeAffichagePublicite`, `StatistiquePublicite(Detaillee\|Restreinte)`, `RequeteCreationPublicite` | formule : `prix, priorite, duree_jours, passages_par_jour, types_affichage[], nb_images_max, video_autorisee` ; campagne : `formule, formule_nom?, formule_prix?, statut, image_couverture, debut/fin_diffusion` |
| `publicites-admin.model.ts` | `PubliciteAdmin`, `StatsPublicitesAdmin`, `TRANSITIONS_ADMIN_PUBLICITE`, `TypeExportPublicites` | vue admin complète, champs statistiques optionnels par prudence |
| `profil-partenaire.model.ts` | `ProfilPartenaire`, `RequeteMiseAJourProfilPartenaire`, `OPTIONS_TYPE_PARTENAIRE` | `id (≠ User.id, c'est ProfilPartenaire.id)`, champs éditables (nom_commerce, adresse, GPS...) + champs lecture-seule pilotés admin (`statut, est_visible, badge_certifie, est_faveur, plan_libelle, abonnement_fin, nb_vues, nb_articles_max`) |
| `profil-partenaire-faveur.model.ts` | `ProfilPartenaireFaveur`, `CodePlan` (4 plans en dur), `RequeteAccorderPlan` | pas d'endpoint de lecture de l'état courant (voir §8) |
| `article.model.ts` | `ArticleListe`, `ArticleDetail`, `TypeArticle`, `RequeteArticle` | `prix_effectif, pourcentage_reduction, nb_vues, nb_likes, categorie, image_principale` |
| `image-article.model.ts` | `ImageArticle` | `ordre, est_principale, est_active` |
| `categorie-catalogue.model.ts` | `CategorieCatalogue` (arbre), `CategorieCatalogueAplatie`, `aplatirCategories()` | arbre récursif `enfants[]` |
| `categorie-globale.model.ts` | `CategorieGlobale` | liste plate (distincte de l'arbre ci-dessus, usage différent) |
| `ma-categorie.model.ts` | `MaCategorie` | lien vers `CategorieGlobale.id` |
| `departement.model.ts` | `Departement` | `nom, region, district` (lecture seule) |
| `pagination.model.ts` | `ReponsePaginee<T>` | format DRF standard `{count,next,previous,results}` |
| `gestion-admins.model.ts` | `AdminGere`, `RequeteCreerAdmin`, `ReponseCreationAdmin`, `GROUPES_CAPACITES`, `compterCapacitesActives()` | `capacites: Record<string,boolean>` |
| `compte-moderation.model.ts` | `CompteModeration`, `ActionModeration`, `ACTIONS_PAR_ETAT`, `CONSEQUENCES_ACTION` | états `actif\|suspendu\|banni\|supprime\|inactif` (`inactif` volontairement sans action, contrat non confirmé) |
| `creation-partenaire.model.ts` | `RequeteCreationPartenaire`, `ReponseCreationPartenaire`, `TypePartenaireCreation` | `pin_par_defaut` = PIN en clair renvoyé une seule fois |
| `credit-pub.model.ts` | `CreditPub`, `PartenaireRecherche`, `PartenaireCredits`, `FormulePub` | `FormulePub` est un doublon partiel de `FormulePublicite` (vue admin allégée) |
| `demande-partenariat.model.ts` | `DemandePartenariat`, `DecisionDemandePartenariat` | liste = uniquement `statut=en_attente` |
| `entree-journal.model.ts` | `EntreeJournal`, `ReponseJournalAudit` | `total` peut dépasser `entrees.length` (max 200 renvoyées) |
| `indicateurs-partenaires.model.ts` | `IndicateursPartenaires`, `ExpirationsAbonnement` | répartitions en `Record<string,number>` à clés variables |
| `stats-connexion.model.ts` | `StatsConnexion` | réutilise les formes de `tableau-bord-admin.model.ts` |
| `tableau-bord-admin.model.ts` | `TableauBordAdmin`, `RepartitionParRole`, `EnLigneAdmin`, `ConnexionsDistinctesAdmin`, `OuverturesAdmin`, `AppareilsAdmin` | ne couvre pas la livraison (backend séparé) |
| `tableau-de-bord-partenaire.model.ts` | `StatsVuesPartenaire`, `VueTableauDeBordPartenaire` (+ sous-vues Ensemble/Produits/Commandes) | view-models 100% agrégés côté front par `TableauDeBordPartenaireService` |
| `engagement-clients.model.ts` | `EngagementClients`, `ProfilEngagement` | `est_client_actif` déjà calculé backend (7j connexion ET ≥5 articles vus/mois ET ≥15min cumulées/mois) |
| `fonctionnalites/livraison/modeles/course-livraison.model.ts` | `CourseLivraison`, `StatutCourse` (9 valeurs), `PointCourse`, `RequeteCreerCourse` | isolé du reste des modèles (pas dans `modeles/` racine) |
| `fonctionnalites/livraison/modeles/livreur-bureau.model.ts` | `LivreurBureau`, `StatutLivreur`, `TypeVehicule` | idem, isolé |
| `fonctionnalites/livraison/modeles/compte-equipe-livraison.model.ts` | `SuperviseurCompte`, `GestionnaireCompte`, `LivreurCompte`, `nomAfficheCompteEquipe()` | champs de liste volontairement tolérants (contrat GET non détaillé au-delà de l'affichage) |
| `fonctionnalites/livraison/modeles/stats-livraison.model.ts` | `StatsLivraisonDonnees`, `ModeAffichageStats` | `par_jour`/`par_mois` typés par symétrie avec `par_heure` (non détaillés dans le contrat) |

---

## 7. Notifications existantes

### 7.1 Mécanisme actuel (commandes partenaire)

- **Fichier** : `partage/mise-en-page/cloche-notifications/cloche-notifications.ts` (+ `.html`/`.scss`), monté dans `en-tete.html` **uniquement si `estPartenaire()`**.
- **Moteur** : `noyau/notifications/detecteur-compteur.ts` (`DetecteurCompteur<ResumeCommandes>`, fourni localement au composant).
- **Intervalle** : 10000 ms (`INTERVALLE_POLLING_MS`).
- **Endpoint** : `GET /orders/commandes/partenaire/resume/` (via `MesCommandesService.resume()`), champ surveillé : `nouvelles`.
- **Déclenchement du son** : `public/sons/notification.wav`, joué via un `<audio>` caché, uniquement si `interactionUtilisateurEffectuee` est vrai (posé au premier `pointerdown`/`keydown` de la page — contournement des restrictions navigateur sur l'autoplay), et jamais sur le tout premier chargement (le détecteur ne signale une « augmentation » qu'après une première valeur de référence).
- **Effet visuel** : badge + icône animée (`enAnimation`, 1200 ms), badge « vu » dissocié du vrai compteur backend (consultation du panneau ≠ acquittement serveur).
- **Clic** → navigue vers `/mes-commandes?statut=nouvelle`.
- Conçu explicitement (commentaires du code) pour être réutilisé par une future cloche « courses entrantes » côté TeneLivr, en instanciant `DetecteurCompteur` avec une autre source — **pas encore fait** (aucune cloche dans `fonctionnalites/livraison/`).

### 7.2 Firebase / FCM / Web Push / Service Worker

- **Aucune intégration Firebase/FCM** dans le code (aucun fichier, aucun import, aucune clé de config).
- Le modèle `Utilisateur` déclare un champ `token_fcm?: string | null` — **jamais lu, jamais envoyé, jamais peuplé** par aucun écran ni service : vestige défensif d'une fonctionnalité push non implémentée côté front.
- **Service worker Angular (PWA) présent et actif** : `@angular/service-worker` en dépendance, enregistré dans `app.config.ts` (`provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' })`), configuré par `ngsw-config.json` à la racine du repo. Ce service worker gère uniquement le **cache offline des assets statiques** (2 groupes : `app` en prefetch pour html/css/js/manifest, `assets` en lazy pour les images/fonts) — **aucun bloc `push` ou `notification`**, donc pas de capacité Web Push configurée à ce niveau.
- `public/manifest.webmanifest` présent (nom, icônes 72→512px, `display: standalone`) : l'app est **installable comme PWA**, mais cela ne fournit pas de notifications push par soi-même.
- Conclusion : la seule « notification » existante est le polling + son de la cloche partenaire (§7.1), rien côté push/FCM.

---

## 8. État / manques

### 8.1 Écrans explicitement placeholders (`EcranAVenir` / `EcranAVenirLivraison`)

| Route | Titre affiché | Message |
|---|---|---|
| `/administration/paiements` | Paiements | « Module de paiement — bientôt disponible. » |
| `/livraison/superviseur` | Ma ville | (générique) |
| `/livraison/superviseur/comptes` | Comptes de ma ville | (générique) |
| `/livraison/gestionnaire/livreurs` | Livreurs | (générique) |

Le commentaire dans `barre-laterale-livraison.ts` (« pour A1, toutes pointent vers des placeholders à venir ») est **partiellement obsolète** : la plupart des écrans TeneLivr sont maintenant réels (dispatching, carte, stats, gestion des comptes coordonnateur) ; seuls les 3 ci-dessus restent des coquilles.

### 8.2 Capacités admin déclarées mais sans écran qui les consomme

Sur les 33 capacités de `NomCapacite` (regroupées dans `GROUPES_CAPACITES`, assignables via l'écran Gestion des admins), les suivantes ne sont **vérifiées ni consommées par aucun autre écran** du dépôt (recherche exhaustive de leur nom littéral) :

- `valider_commande` — aucune vue de validation de commande côté admin.
- `valider_paiement` — aucune vue de validation de paiement (la route `/administration/paiements` existe mais est gated par `voir_stats`, pas `valider_paiement`, et n'est qu'un placeholder).
- `modifier_plans_formules` — aucun écran de configuration des plans/formules.
- `masquer_partenaire` — aucune action de masquage de partenaire trouvée (ni dans `Moderation`, ni dans `IndicateursPartenairesComponent`, ni ailleurs).
- `certifier_partenaire` — aucune action de certification trouvée.

Ces 5 capacités sont assignables aux admins (visibles dans `GestionAdmins`/`EditerCapacites`) mais n'ouvrent aucune fonctionnalité front actuellement.

### 8.3 Incohérence capacité/route sur les Publicités admin

La route `/administration/publicites` (écran `PublicitesAdmin`) est protégée par `capaciteGuard` → `voir_stats`, alors que ses actions de transition (`confirmer_paiement`, `valider`, `rejeter`, `terminer`) correspondent sémantiquement à la capacité `valider_publicite`. Un admin ayant `voir_stats` mais pas `valider_publicite` peut donc accéder à l'écran et voir les boutons de transition, qui échoueront vraisemblablement côté backend (403 non géré spécifiquement dans le composant au-delà du message d'erreur générique).

### 8.4 `exporter_csv` non vérifiée côté front

La capacité `exporter_csv` existe dans le modèle et le groupe « Consultation & données », mais aucun bouton d'export (Journal d'audit, Stats de connexion, Indicateurs partenaires, Publicités admin) ne teste `capacites['exporter_csv']` avant d'appeler son endpoint `.../export/` — l'accès à l'écran parent (via sa propre capacité) suffit côté front ; l'éventuelle restriction plus fine serait donc uniquement backend, non reflétée dans l'UI (pas de bouton caché/désactivé si l'admin n'a que la capacité d'écran sans `exporter_csv`).

### 8.5 Branchement backend partiel signalé dans le code

- **`faveur-plan.ts`** (docblock) : *« Il n'existe pas d'endpoint pour lire l'état d'abonnement courant d'un partenaire avant action — l'écran ne peut donc afficher plan/faveur qu'après la première [action] »* : impossible d'afficher le plan actuel d'un partenaire avant de lui accorder/retirer une faveur, seul l'état post-action est visible.
- **`compte-moderation.model.ts`** : l'état `inactif` de `EtatCompte` n'a **aucune action définie** (`ACTIONS_PAR_ETAT.inactif = []`) — volontaire, le contrat backend ne précise pas le comportement attendu pour cet état plutôt que d'en inventer un.
- **`journal-audit.ts`**, **`engagement-clients.ts`** : filtrage/tri/pagination **entièrement côté client** — les endpoints (`/administration/moderation/journal/`, `/analytics/admin/engagement/`) ne proposent aucun paramètre de ce type, tout est chargé d'un coup.
- **Champs `departement`/`latitude`/`longitude` de `ProfilPartenaire`** : commentaire du modèle les marque comme *« non confirmés dans la doc API déjà vérifiée »*, ajoutés défensivement (affichage « non renseigné » si absents).

### 8.6 Doublons de modèles à noter (pas des bugs, mais à surveiller)

- `CategorieCatalogue` (arbre récursif, `catalogue/categories/`) vs `CategorieGlobale` (liste plate, même endpoint mais usage différent — sélecteurs d'articles vs dialog « Mes catégories ») : deux modèles distincts intentionnellement séparés (commentaire explicite dans le code).
- `FormulePub` (`credit-pub.model.ts`, vue admin allégée) vs `FormulePublicite` (`publicite.model.ts`, vue partenaire complète) : deux interfaces pour la même ressource backend (`/publicites/formules/`), non consolidées.
- Le endpoint `POST /publicites/mes-publicites/<id>/masquer/` est appelé depuis **deux services distincts** (`onglet-gestion-publicites.service.ts` et `onglet-points-publicites.service.ts`), chacun avec sa propre méthode — cohérent avec la convention du projet (un service par onglet), mais techniquement dupliqué.

### 8.7 Chunks présents au build sans route propre

- `tableau-de-bord-admin` et `tableau-de-bord-partenaire` n'ont **pas de route dédiée** : ils sont montés conditionnellement à l'intérieur du composant générique `TableauDeBord` (`/tableau-de-bord`), qui choisit l'un ou l'autre selon `authService.role()`. Ce n'est pas un manque — juste une indirection à connaître en cherchant « où est monté cet écran ? ».
