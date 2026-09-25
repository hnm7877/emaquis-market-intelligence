# PROMPT MAÎTRE — E-MAQUIS MARKET INTELLIGENCE

## 1. CONTEXTE DU PROJET

Nous développons E-Maquis, une plateforme ivoirienne de gestion des stocks et des ventes destinée notamment aux :

* maquis ;
* bars ;
* restaurants ;
* hôtels ;
* dépôts de boissons ;
* grossistes ;
* distributeurs ;
* autres établissements vendant des boissons et produits de consommation.

L'application permet déjà de gérer notamment :

* les produits ;
* les catégories ;
* les stocks ;
* les ventes ;
* les employés ;
* les utilisateurs ;
* les promotions ;
* les objectifs ;
* les retours ;
* les statistiques ;
* les établissements.

L'objectif est maintenant de transformer progressivement E-Maquis en une plateforme de **Market Intelligence / Business Intelligence** capable d'exploiter les données commerciales générées par le réseau E-Maquis.

Le produit à construire s'appelle :

# E-MAQUIS MARKET INTELLIGENCE

Il doit permettre à E-Maquis de fournir à ses partenaires professionnels une vision agrégée et anonymisée du comportement du marché.

Les partenaires potentiels sont notamment :

* producteurs de boissons ;
* brasseries ;
* fabricants ;
* distributeurs ;
* grossistes ;
* marques ;
* agences marketing ;
* instituts d'études ;
* entreprises FMCG ;
* acteurs de la grande consommation ;
* autres entreprises ayant besoin de comprendre la consommation hors domicile.

---

# 2. OBJECTIF BUSINESS

Le système doit permettre de répondre à des questions telles que :

* Quels produits se vendent le plus ?
* Dans quelles villes ?
* Dans quelles communes ?
* Dans quels quartiers ?
* Dans quels types d'établissements ?
* À quelles périodes ?
* À quelles heures ?
* Quelle est l'évolution des ventes ?
* Quels produits progressent ?
* Quels produits diminuent ?
* Quelles catégories progressent ?
* Quels produits ont une forte rotation ?
* Quels produits connaissent des ruptures fréquentes ?
* Quelles zones présentent une demande croissante ?
* Quels produits sont souvent achetés ensemble ?
* Comment une promotion influence-t-elle les ventes ?
* Comment évoluent les ventes d'une marque dans une zone ?
* Comment se comporte une catégorie par rapport aux autres catégories ?
* Quelle est la tendance de consommation ?
* Quels signaux peuvent indiquer une augmentation future de la demande ?

IMPORTANT :

Le système ne doit PAS présenter de données permettant d'identifier directement un consommateur individuel.

Les données destinées aux partenaires externes doivent être :

* agrégées ;
* anonymisées ;
* suffisamment regroupées pour éviter la ré-identification ;
* contrôlées selon les droits d'accès ;
* séparées des données opérationnelles privées des établissements.

La plateforme doit respecter les règles applicables en matière de protection des données personnelles.

---

# 3. ARCHITECTURE EXISTANTE À RESPECTER

Architecture actuelle :

BACKEND :

* NestJS
* MongoDB
* Mongoose / accès MongoDB existant selon les modules déjà présents
* architecture modulaire NestJS
* authentification existante
* utilisateurs existants
* établissements existants
* produits existants
* ventes existantes
* stocks existants

FRONTEND :

* Next.js
* TypeScript
* architecture frontend existante à conserver

AGENT IA :

* DeerFlow est déjà configuré côté backend.
* Un agent IA doit être développé/intégré dans Antigravity.
* L'agent doit exploiter les données autorisées via les services backend.
* Ne pas créer un deuxième système d'agent indépendant si l'infrastructure DeerFlow existante peut être réutilisée.

IMPORTANT :

Avant toute modification :

1. analyser le repository ;
2. identifier l'architecture existante ;
3. identifier les modules NestJS existants ;
4. identifier les modèles MongoDB existants ;
5. identifier les relations entre :

   * User
   * Employee
   * Produitglobal
   * Produit
   * Category
   * Stock
   * Sale
   * Promotion
   * établissement ;
6. identifier le système d'authentification ;
7. identifier le système de permissions ;
8. identifier le système de tenant / établissement ;
9. identifier la configuration DeerFlow existante ;
10. identifier les services et controllers existants.

NE PAS réécrire l'architecture existante.

NE PAS supprimer une fonctionnalité existante.

NE PAS modifier la logique métier existante sans justification.

Réutiliser au maximum les modèles, services et utilitaires déjà présents.

---

# 4. MÉTHODOLOGIE DE DÉVELOPPEMENT OBLIGATOIRE

Tu dois travailler en plusieurs étapes.

## ÉTAPE 1 — AUDIT

Commence par analyser complètement le projet.

Produis d'abord un rapport comprenant :

* architecture actuelle ;
* modules backend ;
* modèles MongoDB ;
* API existantes ;
* système d'authentification ;
* système de permissions ;
* système multi-tenant ;
* frontend ;
* configuration DeerFlow ;
* points d'intégration possibles.

Ne code pas immédiatement.

Identifie également :

* les risques ;
* les doublons ;
* les données disponibles ;
* les données manquantes ;
* les transformations nécessaires.

---

# 5. NOUVEAU MODULE BACKEND

Créer un module NestJS :

MarketIntelligenceModule

Structure souhaitée :

market-intelligence/

├── controllers/
├── services/
├── schemas/
├── dto/
├── guards/
├── analytics/
├── aggregation/
├── intelligence/
├── reports/
└── market-intelligence.module.ts

Adapter cette structure à l'architecture réelle du projet si nécessaire.

---

# 6. MODÈLES DE DONNÉES

Créer ou adapter les modèles nécessaires.

## MarketSnapshot

Permet de stocker des agrégats périodiques.

Exemples :

* date ;
* ville ;
* commune ;
* zone ;
* catégorie ;
* produit ;
* marque ;
* volume vendu ;
* quantité vendue ;
* chiffre d'affaires agrégé ;
* nombre de points de vente ;
* taux de rotation ;
* évolution ;
* indice de demande.

NE PAS stocker inutilement des informations personnelles.

---

# 7. MarketMetric

Créer un système générique de métriques.

Exemples :

SALES_VOLUME

REVENUE

GROWTH_RATE

MARKET_SHARE_ESTIMATE

STOCK_ROTATION

REORDER_FREQUENCY

STOCKOUT_RATE

AVERAGE_BASKET

PRODUCT_PENETRATION

PROMOTION_IMPACT

DEMAND_INDEX

CATEGORY_GROWTH

ZONE_GROWTH

---

# 8. ZONES GÉOGRAPHIQUES

Le système doit pouvoir analyser :

## Niveau 1

Pays

Côte d'Ivoire

## Niveau 2

Ville

Exemples :

* Abidjan
* Bouaké
* Yamoussoukro
* San Pedro
* Korhogo
* Daloa
* etc.

## Niveau 3

Commune

Exemples :

* Cocody
* Yopougon
* Abobo
* Marcory
* Koumassi
* Port-Bouët
* Treichville
* Adjamé
* Bingerville
* etc.

## Niveau 4

Zone/quartier

Uniquement lorsque le volume de données permet une agrégation suffisamment sûre.

Prévoir une structure extensible afin d'ajouter d'autres pays d'Afrique de l'Ouest plus tard.

---

# 9. DIMENSIONS ANALYTIQUES

Le moteur doit pouvoir croiser :

DATE
+
ZONE
+
VILLE
+
COMMUNE
+
TYPE D'ÉTABLISSEMENT
+
CATÉGORIE
+
MARQUE
+
PRODUIT
+
PROMOTION

Exemple :

"Ventes de bières à Yopougon en septembre 2026"

ou :

"Évolution de la marque X dans les bars de Cocody pendant les 90 derniers jours."

---

# 10. TABLEAU DE BORD E-MAQUIS MARKET INTELLIGENCE

Créer un dashboard Next.js professionnel.

Style :

* moderne ;
* premium ;
* orienté data ;
* lisible ;
* responsive ;
* desktop-first pour les analystes ;
* mobile compatible.

Le dashboard doit comporter :

## KPI 1

Points de vente actifs

## KPI 2

Transactions analysées

## KPI 3

Produits analysés

## KPI 4

Zones couvertes

## KPI 5

Volume de ventes

## KPI 6

Croissance

## KPI 7

Indice de demande

## KPI 8

Produits en forte progression

---

# 11. PAGE "MARKET OVERVIEW"

Créer :

/market-intelligence

Contenu :

* KPIs ;
* graphique évolution des ventes ;
* top catégories ;
* top produits ;
* top marques ;
* zones à forte croissance ;
* zones en baisse ;
* alertes marché ;
* tendances.

Filtres :

* période ;
* ville ;
* commune ;
* catégorie ;
* marque ;
* produit ;
* type d'établissement.

---

# 12. PAGE "GEOGRAPHY"

Créer une vue géographique.

Objectif :

visualiser les performances par zone.

Exemple :

Côte d'Ivoire
→ Abidjan
→ Yopougon
→ Cocody
→ Abobo
etc.

Le système doit afficher :

* volume ;
* croissance ;
* demande ;
* rotation ;
* disponibilité.

Prévoir une architecture compatible avec une future carte interactive.

---

# 13. PAGE "PRODUCTS"

Afficher :

* top produits ;
* produits en croissance ;
* produits en baisse ;
* rotation ;
* fréquence de réapprovisionnement ;
* évolution ;
* zones principales.

Exemple :

Produit A

Ventes :

12 450

Croissance :

+18 %

Zones principales :

Yopougon / Abobo / Cocody

---

# 14. PAGE "BRANDS"

Créer une analyse par marque.

Afficher :

* ventes ;
* évolution ;
* pénétration ;
* zones ;
* catégories ;
* tendances.

IMPORTANT :

Les données concurrentielles doivent être présentées sous forme agrégée et autorisée.

---

# 15. PAGE "COMPETITIVE INTELLIGENCE"

Créer une section :

Competitive Intelligence

Elle doit permettre de comparer des catégories / marques / produits selon les données disponibles.

Exemple :

Produit A
vs
Produit B
vs
Produit C

Afficher :

* évolution ;
* volume relatif ;
* présence géographique ;
* tendance ;
* rotation.

Ne jamais présenter une estimation comme une vérité absolue.

Toujours afficher le niveau de confiance ou la taille de l'échantillon lorsque pertinent.

---

# 16. PAGE "CONSUMPTION TRENDS"

Créer :

Consumption Trends

Afficher :

* tendances quotidiennes ;
* hebdomadaires ;
* mensuelles ;
* saisonnalité ;
* périodes fortes ;
* périodes faibles.

Identifier automatiquement :

* croissance ;
* baisse ;
* anomalies ;
* changement de comportement.

---

# 17. PAGE "PROMOTIONS"

Analyser l'impact des promotions.

Exemple :

Avant promotion :

100 ventes/jour

Pendant :

145 ventes/jour

Après :

120 ventes/jour

Calculer :

* uplift ;
* évolution ;
* durée de l'effet ;
* comparaison avec une période de référence.

---

# 18. PAGE "STOCK INTELLIGENCE"

L'objectif est d'aider les marques et distributeurs à comprendre :

* zones de forte demande ;
* risques de rupture ;
* fréquence de réapprovisionnement ;
* vitesse de rotation ;
* tendances.

Exemple :

"Demande croissante détectée à Yopougon."

"Rotation élevée détectée pour la catégorie X."

"Risque de rupture observé dans plusieurs points de vente."

---

# 19. MARKET REPORT

Créer un générateur de rapports.

Un utilisateur autorisé doit pouvoir générer :

PDF / export / rapport web

Exemple :

E-MAQUIS MARKET REPORT

Période :

01/09/2026 → 30/09/2026

Zone :

Abidjan

Catégorie :

Boissons

Contenu :

* résumé exécutif ;
* évolution du marché observé ;
* top produits ;
* top catégories ;
* tendances géographiques ;
* analyse des promotions ;
* alertes ;
* opportunités ;
* méthodologie ;
* couverture de l'échantillon.

---

# 20. RAPPORT PERSONNALISÉ POUR UN PARTENAIRE

Créer un système de rapports personnalisables.

Exemple :

Partenaire :

Entreprise X

Territoire :

Abidjan

Catégories :

Bières + boissons gazeuses

Période :

90 jours

Le rapport doit générer automatiquement :

* KPIs ;
* graphiques ;
* évolutions ;
* zones ;
* produits ;
* catégories ;
* tendances ;
* commentaires analytiques.

---

# 21. AGENT IA DEERFLOW

C'est une partie majeure du projet.

L'agent doit être capable d'analyser les données autorisées.

Exemples de questions :

"Quels produits progressent le plus à Yopougon ?"

"Quelle catégorie progresse le plus ce mois-ci ?"

"Quelles zones montrent une hausse de demande ?"

"Compare la performance du produit A et du produit B."

"Pourquoi les ventes semblent-elles diminuer dans cette zone ?"

"Quelles anomalies observes-tu ?"

"Prépare-moi un rapport marché sur Abidjan."

---

# 22. L'AGENT NE DOIT PAS INVENTER DE DONNÉES

Règle absolue :

L'agent doit uniquement utiliser les données réellement disponibles.

Il doit :

1. interroger les services analytiques ;
2. récupérer les données ;
3. analyser ;
4. calculer ;
5. expliquer ;
6. citer la période ;
7. indiquer la couverture ;
8. indiquer les limites.

Si les données sont insuffisantes :

dire clairement :

"Les données disponibles ne permettent pas de conclure."

Ne jamais halluciner un chiffre.

---

# 23. OUTILS DE L'AGENT

Créer des tools DeerFlow tels que :

get_market_overview

get_sales_trends

get_product_performance

get_brand_performance

get_category_performance

get_geographic_performance

get_competitive_analysis

get_stock_intelligence

get_promotion_impact

get_market_anomalies

get_demand_forecast

generate_market_report

get_data_coverage

---

# 24. EXEMPLE DE WORKFLOW DE L'AGENT

Utilisateur :

"Que se passe-t-il avec les ventes de bières à Yopougon ?"

Agent :

1. identifie Yopougon ;
2. identifie catégorie bière ;
3. demande la période si nécessaire ;
4. interroge les données ;
5. calcule évolution ;
6. compare avec période précédente ;
7. identifie produits ;
8. identifie anomalies ;
9. produit un résumé.

Réponse :

"Sur les 30 derniers jours, les ventes observées de la catégorie bière ont évolué de X %. L'analyse porte sur X points de vente et X transactions. Les produits présentant la plus forte progression sont [...]."

---

# 25. PRÉDICTION

Prévoir une architecture permettant d'ajouter progressivement :

* prévision de demande ;
* détection d'anomalies ;
* saisonnalité ;
* recommandations de stock ;
* prévision par zone ;
* prévision par catégorie ;
* prévision par produit.

Ne pas introduire immédiatement un modèle ML complexe si les données ne sont pas suffisamment propres.

Commencer par des méthodes statistiques robustes et explicables.

L'architecture doit toutefois permettre plus tard l'intégration de modèles :

* Prophet ;
* ARIMA ;
* modèles ML ;
* modèles personnalisés.

---

# 26. DATA QUALITY

Créer un système de contrôle qualité.

Vérifier :

* données manquantes ;
* doublons ;
* ventes incohérentes ;
* quantités anormales ;
* dates incorrectes ;
* produits inexistants ;
* établissements incorrects ;
* valeurs extrêmes.

Créer :

DataQualityService

et éventuellement :

DataQualityReport

---

# 27. DATA COVERAGE

C'est une fonctionnalité essentielle pour la crédibilité commerciale.

Créer une page :

Data Coverage

Afficher :

* nombre d'établissements ;
* nombre de villes ;
* nombre de communes ;
* nombre de transactions ;
* période couverte ;
* catégories couvertes ;
* produits couverts.

Exemple :

COUVERTURE E-MAQUIS

12 500 établissements

38 villes

147 communes/zones

8,4 millions de transactions

24 mois de données

IMPORTANT :

Ne jamais afficher de faux chiffres.

Utiliser exclusivement les données réellement présentes dans MongoDB.

---

# 28. PORTAIL PARTENAIRE

Créer un système de comptes partenaires.

Rôles possibles :

SUPER_ADMIN

DATA_ADMIN

ANALYST

PARTNER_ADMIN

PARTNER_ANALYST

PARTNER_VIEWER

Chaque partenaire ne doit voir que les données auxquelles il a droit.

---

# 29. PARTNER PORTAL

Créer :

/partner

Dashboard partenaire.

Le partenaire peut voir :

* ses rapports ;
* ses dashboards ;
* ses zones ;
* ses produits ;
* ses campagnes ;
* ses analyses ;
* ses exports.

---

# 30. ABONNEMENTS DATA

Préparer l'architecture pour plusieurs offres.

## MARKET BASIC

* dashboard général ;
* tendances ;
* rapports mensuels.

## MARKET PRO

* analyses géographiques ;
* produits ;
* catégories ;
* rapports avancés.

## MARKET ENTERPRISE

* API ;
* rapports personnalisés ;
* analyses avancées ;
* prévisions ;
* accès multi-utilisateurs ;
* accompagnement.

Ne pas obligatoirement implémenter le paiement maintenant.

Préparer l'architecture.

---

# 31. API PARTENAIRE

Prévoir une future API :

/api/market-intelligence

Endpoints possibles :

GET /overview

GET /sales

GET /products

GET /brands

GET /categories

GET /geography

GET /trends

GET /reports

GET /forecast

GET /coverage

Les API doivent être protégées par :

* authentification ;
* autorisation ;
* rate limiting ;
* journalisation ;
* permissions.

---

# 32. AUDIT LOG

Chaque accès aux données sensibles doit être journalisé.

Exemple :

Partner X

User Y

Action :

MARKET_DATA_QUERY

Date :

2026-09-25

Filtre :

Abidjan / Bières / 90 jours

---

# 33. SÉCURITÉ

Respecter :

* RBAC ;
* multi-tenancy ;
* isolation des données ;
* validation DTO ;
* rate limiting ;
* audit logs ;
* protection des endpoints ;
* secrets dans variables d'environnement ;
* aucune clé API dans le frontend ;
* aucune donnée sensible dans les logs.

---

# 34. FRONTEND

Le dashboard doit être conçu comme un véritable produit SaaS B2B.

Créer :

Sidebar :

Overview
Geography
Products
Brands
Categories
Competition
Trends
Stock Intelligence
Promotions
Reports
AI Intelligence
Data Coverage
Settings

Prévoir :

* dark/light mode si l'application existante le permet ;
* responsive ;
* tableaux ;
* graphiques ;
* filtres ;
* exports ;
* loading states ;
* empty states ;
* error states.

Réutiliser le design system existant.

---

# 35. DESIGN

Le produit doit donner une impression :

* premium ;
* sérieux ;
* data-driven ;
* africain mais international ;
* B2B ;
* moderne.

Éviter une interface trop "application de caisse".

Il s'agit d'un produit de :

MARKET INTELLIGENCE

et non uniquement de gestion de stock.

---

# 36. ANALYTIQUE ET GRAPHIQUES

Utiliser la bibliothèque déjà présente dans le projet si elle existe.

Sinon choisir une solution compatible Next.js.

Graphiques nécessaires :

* line chart ;
* bar chart ;
* area chart ;
* pie/donut lorsque pertinent ;
* heatmap ;
* tableaux ;
* indicateurs KPI.

Ne pas surcharger les dashboards.

---

# 37. EXPORT

Prévoir :

CSV

Excel

PDF

Les exports doivent respecter les permissions.

---

# 38. NOTIFICATIONS INTELLIGENTES

Créer un moteur d'alertes.

Exemples :

DEMAND_INCREASE

DEMAND_DROP

STOCKOUT_RISK

UNUSUAL_SALES

NEW_TREND

PROMOTION_IMPACT

REGIONAL_CHANGE

---

# 39. EXEMPLE D'ALERTE

"📈 Hausse inhabituelle détectée"

Zone :

Yopougon

Catégorie :

Boissons énergisantes

Variation :

+24 %

Période :

14 jours

Couverture :

X établissements

Confiance :

Élevée

---

# 40. MÉTHODOLOGIE ET TRANSPARENCE

Chaque rapport externe doit afficher :

* période ;
* couverture ;
* nombre de points de vente ;
* nombre de transactions ;
* catégories analysées ;
* méthodologie ;
* limites.

Ne jamais présenter une donnée issue uniquement du réseau E-Maquis comme représentant automatiquement tout le marché ivoirien.

Employer des formulations telles que :

"ventes observées dans le réseau E-Maquis"

ou :

"tendance observée dans l'échantillon E-Maquis"

et non :

"marché ivoirien total"

sauf si une méthodologie statistique justifie cette extrapolation.

---

# 41. CONFIDENTIALITÉ DES PARTENAIRES

Prévoir des niveaux de données.

LEVEL 1 :

Public

Données très agrégées.

LEVEL 2 :

Partner

Données agrégées plus détaillées.

LEVEL 3 :

Enterprise

Analyses avancées autorisées.

LEVEL 4 :

Internal

Données opérationnelles internes E-Maquis.

Un partenaire ne doit jamais pouvoir accéder aux données brutes d'un autre partenaire ou d'un établissement sans autorisation explicite.

---

# 42. DONNÉES CONSOMMATEURS

IMPORTANT.

Le système peut exploiter les informations commerciales nécessaires à l'analyse mais ne doit pas exposer :

* nom du consommateur ;
* téléphone ;
* email ;
* adresse personnelle ;
* identifiant personnel ;
* informations permettant de réidentifier une personne.

Le produit Market Intelligence doit privilégier :

AGGREGATION

ANONYMISATION

PSEUDONYMISATION lorsque nécessaire

MINIMISATION

CONTRÔLE D'ACCÈS

---

# 43. STRATÉGIE COMMERCIALE INTÉGRÉE

Prévoir une page marketing publique :

/market-intelligence

Elle doit présenter :

## Hero

"Comprenez ce qui se vend réellement sur le terrain."

Sous-titre :

"Transformez les données de consommation observées dans le réseau E-Maquis en informations exploitables pour vos décisions commerciales."

CTA :

"Demander une démonstration"

Deuxième CTA :

"Voir un exemple de rapport"

---

# 44. DATA CHALLENGE

Créer une fonctionnalité commerciale :

"Data Challenge"

Un prospect peut sélectionner :

* ville ;
* commune ;
* catégorie ;
* période.

Le système génère un aperçu limité.

Exemple :

"Voici ce que nous observons dans cette zone."

Mais ne jamais exposer gratuitement des données sensibles ou permettant de reconstituer le comportement d'un établissement.

CTA :

"Obtenir l'analyse complète"

---

# 45. LEAD MANAGEMENT

Prévoir éventuellement :

Market Intelligence Lead

Champs :

* companyName ;
* contactName ;
* email ;
* phone ;
* companyType ;
* requestedZone ;
* requestedCategory ;
* requestedPeriod ;
* status ;
* createdAt.

Statuts :

NEW

CONTACTED

DEMO

PILOT

CUSTOMER

LOST

---

# 46. ARCHITECTURE ÉVOLUTIVE

Le système doit pouvoir évoluer vers :

E-MAQUIS

↓

Market Intelligence

↓

AI Intelligence

↓

Demand Forecasting

↓

Recommendation Engine

↓

Partner API

↓

West Africa Market Intelligence

Ne pas coder une solution limitée uniquement à Abidjan.

---

# 47. PERFORMANCE

Les analyses lourdes ne doivent pas bloquer les requêtes utilisateur.

Utiliser si nécessaire :

* aggregation MongoDB ;
* materialized aggregates ;
* cache ;
* jobs ;
* queues ;
* snapshots ;
* pré-calculs.

Ne pas recalculer des millions de transactions à chaque ouverture du dashboard.

Prévoir une architecture :

Raw Data

↓

Aggregation Jobs

↓

Market Snapshots

↓

Analytics API

↓

Dashboard / AI Agent

---

# 48. JOBS

Prévoir des jobs périodiques :

DAILY_AGGREGATION

WEEKLY_AGGREGATION

MONTHLY_AGGREGATION

DATA_QUALITY_CHECK

ANOMALY_DETECTION

MARKET_REPORT_GENERATION

---

# 49. OBSERVABILITÉ

Ajouter des logs utiles :

* durée des agrégations ;
* nombre de documents analysés ;
* erreurs ;
* temps de réponse ;
* appels agent ;
* consommation API.

Ne jamais logger les données personnelles.

---

# 50. TESTS

Créer :

* unit tests ;
* integration tests ;
* API tests ;
* permission tests ;
* tenant isolation tests ;
* analytics tests.

Tester notamment :

* accès interdit ;
* données insuffisantes ;
* période vide ;
* produit inexistant ;
* zone inexistante ;
* gros volume ;
* agrégation correcte ;
* calcul de croissance ;
* calcul d'uplift ;
* permissions partenaires.

---

# 51. DOCUMENTATION

Créer une documentation technique :

README_MARKET_INTELLIGENCE.md

Elle doit expliquer :

* architecture ;
* modules ;
* modèles ;
* API ;
* permissions ;
* calculs ;
* jobs ;
* agent DeerFlow ;
* configuration ;
* variables d'environnement ;
* déploiement ;
* tests.

Créer également :

MARKET_INTELLIGENCE_API.md

---

# 52. MÉTHODE DE CALCUL

Tous les indicateurs doivent avoir une définition claire.

Exemple :

Growth Rate :

(currentPeriod - previousPeriod) / previousPeriod × 100

Toujours gérer :

previousPeriod = 0

et les divisions impossibles.

Pour chaque KPI important, créer une fonction/service testable.

---

# 53. AGENT IA — RÈGLES MÉTIER

L'agent doit :

1. comprendre la question ;
2. déterminer les dimensions ;
3. sélectionner les tools ;
4. récupérer les données ;
5. vérifier la couverture ;
6. analyser ;
7. répondre ;
8. expliquer les limites.

L'agent ne doit jamais inventer :

* volumes ;
* parts de marché ;
* pourcentages ;
* tendances ;
* prévisions.

Si une donnée n'est pas disponible :

"Je ne dispose pas de données suffisantes pour répondre."

---

# 54. PRÉVISION IA

Les prévisions doivent toujours afficher :

* période historique ;
* horizon ;
* volume d'observations ;
* modèle utilisé ;
* intervalle d'incertitude lorsque disponible.

Exemple :

"Prévision basée sur les 180 derniers jours de données observées dans le réseau E-Maquis."

---

# 55. IMPORTANT — NE PAS CONFONDRE OBSERVATION ET MARCHÉ TOTAL

C'est une règle fondamentale du produit.

E-Maquis dispose de données issues de son propre réseau.

Donc :

OBSERVATION E-MAQUIS

≠

MARCHÉ TOTAL DE CÔTE D'IVOIRE

Le système doit toujours conserver cette distinction.

---

# 56. LIVRABLES ATTENDUS

À la fin du développement, fournir :

### BACKEND

* MarketIntelligenceModule
* schemas
* services
* controllers
* DTO
* analytics engine
* aggregation engine
* report engine
* permissions
* audit logs
* tests

### FRONTEND

* Market Overview
* Geography
* Products
* Brands
* Competition
* Trends
* Stock Intelligence
* Promotions
* Reports
* AI Intelligence
* Data Coverage
* Partner Portal

### AI

* DeerFlow tools
* agent
* prompts
* guardrails
* data access layer

### DOCUMENTATION

* README
* API documentation
* architecture documentation
* data methodology
* security documentation

---

# 57. ORDRE D'EXÉCUTION

NE PAS essayer de tout développer en une seule fois.

Procéder dans cet ordre :

PHASE 1

Audit du repository.

PHASE 2

Cartographie des données existantes.

PHASE 3

Market aggregation engine.

PHASE 4

Market Intelligence API.

PHASE 5

Dashboard Overview.

PHASE 6

Geography / Products / Categories.

PHASE 7

Reports.

PHASE 8

Partner Portal.

PHASE 9

DeerFlow Agent.

PHASE 10

AI insights.

PHASE 11

Forecasting.

PHASE 12

Data Challenge.

PHASE 13

Security hardening.

PHASE 14

Tests.

PHASE 15

Documentation.

---

# 58. RÈGLE ANTIGRAVITY

Tu dois fonctionner comme un ingénieur senior intégré au projet.

Avant chaque modification importante :

1. inspecter le code existant ;
2. comprendre les dépendances ;
3. réutiliser ce qui existe ;
4. modifier le minimum nécessaire ;
5. vérifier les impacts ;
6. tester ;
7. documenter.

Ne jamais remplacer une architecture existante simplement parce qu'une autre architecture semble plus moderne.

Ne jamais supprimer du code existant sans justification.

Ne jamais modifier les fonctionnalités existantes de l'application E-Maquis sans nécessité.

---

# 59. PREMIÈRE ACTION

Ta première action doit être UNIQUEMENT :

### AUDITER LE PROJET.

Ne commence pas par coder.

Retourne :

1. Architecture actuelle.
2. Modules backend.
3. Modèles MongoDB.
4. Flux de données.
5. API existantes.
6. Système d'authentification.
7. Système multi-tenant.
8. Données exploitables pour Market Intelligence.
9. Données manquantes.
10. Configuration DeerFlow.
11. Points d'intégration possibles.
12. Risques techniques.
13. Proposition d'architecture.
14. Plan de développement par phases.

Après validation de cette analyse, commencer la Phase 2.

# FIN DU PROMPT
