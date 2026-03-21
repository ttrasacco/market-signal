# Roadmap v2

## Phase 0 — Port du MVP (prérequis)

Reconstruire ce qui existe en production dans la nouvelle stack Angular + NestJS.

**Objectif :** pipeline opérationnel identique au MVP SvelteKit.

- [ ] Setup projet Angular + NestJS (monorepo ou repos séparés)
- [ ] Setup PostgreSQL + Drizzle ORM
- [ ] Port des entités domain (`NewsImpact`, `SectorScore`, `ImpactType`, `Sector`)
- [ ] Port du decay model
- [ ] Port des adapters DB (Drizzle schemas)
- [ ] Port de l'adapter Anthropic (classifier)
- [ ] Port des fakes (tests)
- [ ] Port des use cases / command handlers
- [ ] Pipeline cron quotidien opérationnel
- [ ] Dashboard Angular — sector score cards + trend indicators
- [ ] Déploiement (Vercel ou équivalent)

---

## Étape 1 — Embeddings (fondation)

**Objectif :** chaque `news_impact` reçoit un embedding sémantique. Fondation pour toutes les étapes suivantes.

- [ ] Activer pgvector sur PostgreSQL (`CREATE EXTENSION vector`)
- [ ] Ajouter colonne `embedding vector(1536)` sur `news_impacts`
- [ ] `EmbeddingsModule` NestJS avec port `EmbeddingProviderPort`
- [ ] Adapter Anthropic embeddings (ou OpenAI text-embedding-3-small)
- [ ] Calculer l'embedding au moment de l'ingestion de chaque `news_impact`
- [ ] Index pgvector (`ivfflat` ou `hnsw`) pour les recherches de similarité

**Résultat :** possibilité de trouver les news_impacts sémantiquement proches d'un impact donné.

---

## Étape 2 — Métadonnées enrichies

**Objectif :** enrichir le modèle `news_impact` avec les métadonnées nécessaires aux étapes suivantes.

Nouveaux champs à ajouter à `news_impacts` :

- [ ] `confidence float [0,1]` — score de confiance du LLM sur la classification
- [ ] `geographic_scope GeoScope` — LOCAL | REGIONAL | GLOBAL
- [ ] `country_codes string[]` — pays concernés (ex: `['IR', 'IL', 'US']`)
- [ ] `regions string[]` — régions concernées (ex: `['Middle East']`)

Mettre à jour le prompt LLM du classifier pour extraire ces champs.

**Résultat :** chaque impact est qualifié géographiquement et porte un indice de fiabilité.

---

## Étape 3 — Boucle qualité confiance

**Objectif :** améliorer la qualité des impacts à faible confiance en allant chercher le texte complet.

- [ ] Stocker l'URL de chaque news dans la table `news`
- [ ] Job quotidien : sélectionner les 10 `news_impacts` avec le `confidence` le plus bas
- [ ] Fetcher le texte complet de l'article depuis la source
- [ ] Stocker le texte dans `news.full_text`
- [ ] Relancer la classification LLM avec le texte complet
- [ ] Mettre à jour `impact_score`, `impact_type`, `confidence` du `news_impact`

**Résultat :** correction automatique des mauvaises classifications dues à des titres ambigus ou trompeurs.

---

## Étape 4 — Source quality

**Objectif :** mesurer la fiabilité et la pertinence de chaque flux RSS.

Nouvelle table `source_quality` :

- [ ] `avg_confidence` — moyenne glissante du confidence_score sur 30 jours
- [ ] `correction_rate` — % d'articles reclassifiés après fetch complet (étape 3)
- [ ] `signal_rate` — % d'articles avec `|impact_score| > 0.1` (pertinence)
- [ ] `sector_coverage jsonb` — distribution sectorielle `{ "Technology": 0.4, ... }`

- [ ] Job hebdomadaire qui calcule et met à jour `source_quality`
- [ ] Utiliser `source_quality.signal_rate` comme multiplicateur optionnel dans le calcul de score

**Résultat :** détection automatique des sources peu fiables (titres trompeurs) et peu pertinentes (bruit non financier).

---

## Étape 5 — Clustering & macro_signals

**Objectif :** faire émerger les macro thèmes structurels depuis l'event store, et détecter les contradictions entre événements.

### 5a — Clustering

- [ ] Algorithme de clustering sur les embeddings (`pgvector` + logique applicative)
- [ ] Assigner un `cluster_id` à chaque `news_impact` au moment de l'ingestion
- [ ] Job hebdomadaire de re-clustering sur la fenêtre d'impacts actifs (poids > 5%)

### 5b — Macro signals (émergence)

Utiliser les `news_impacts` actifs (filtrés par poids de décroissance > seuil) comme input :

- [ ] Filtrer les impacts avec poids résiduel `e^(-λ × age) < 0.05` → ignorés
- [ ] Regrouper par cluster, analyser la cohérence directionnelle
- [ ] LLM job hebdomadaire : "voici les clusters actifs, nomme et décris chaque macro thème"
- [ ] Stocker dans `macro_signals` avec `sectors[]`, `direction`, `intensity`

### 5c — Correction par cluster

- [ ] Détecter : nouveau STRUCTURAL fort (|score| > 0.7) dans un cluster existant avec signe opposé
- [ ] Déclencher recalcul ciblé des `sector_scores` des secteurs du cluster
- [ ] Neutraliser les impacts de direction opposée dans le recalcul

### 5d — Dashboard "wall of forces"

- [ ] Panel Angular — vents favorables / vents contraires
- [ ] Affichage des `macro_signals` actifs avec secteurs impactés
- [ ] Hover sur un macro signal → highlight des secteurs concernés

**Résultat :** dashboard transformé en outil de lecture du marché — scores + contexte structurel.

---

## Étape 6 — Personnalisation géographique

**Objectif :** contextualiser les scores et signaux selon la localisation de l'utilisateur.

- [ ] Profil utilisateur avec `country` et `regions_of_interest`
- [ ] Pondération des `news_impacts` par pertinence géo (impact sur pays hors scope → poids réduit)
- [ ] Filtrage des `macro_signals` par pertinence géo
- [ ] Dashboard personnalisé selon le profil

**Résultat :** un utilisateur en France voit les signaux pertinents pour son contexte géographique.

---

## Étape 7 — UI gestion des sources + freemium

**Objectif :** exposer la qualité des sources à l'utilisateur et poser la fondation d'un modèle freemium.

- [ ] Page de gestion des sources RSS
- [ ] Carte par source : score de fiabilité + score de pertinence + radar sectoriel
- [ ] Toggle actif/inactif par source
- [ ] Modèle freemium : 5 sources gratuites incluses, sources spécialisées payantes
- [ ] UI qui montre la couverture sectorielle manquante avec les sources gratuites

**Résultat :** curation intelligente du portefeuille de données. Fondation monétisation.

---

## Feature transverse — Newsletter ingestion

**Peut s'implémenter à partir de l'étape 2 (confidence disponible).**

Le LLM ingère une newsletter financière hebdomadaire et produit **3 types de sorties** :

1. **Faits non captés par les RSS** → `news_impacts` normaux (PUNCTUAL)
2. **Signaux structurels sectoriels** → `news_impacts` (STRUCTURAL)
3. **Contextes macro/géopolitiques cross-secteurs** → `macro_signals` (injection directe)

- [ ] Endpoint `POST /api/newsletter/ingest` — accepte le texte brut de la newsletter
- [ ] `NewsletterModule` NestJS avec `AnthropicNewsletterParser`
- [ ] Prompt structuré : extraire facts, structural signals, macro context séparément
- [ ] Pipeline : créer les `news_impacts` + `macro_signals` correspondants
- [ ] Source tag `source = 'newsletter'` pour distinguer dans les stats source_quality
