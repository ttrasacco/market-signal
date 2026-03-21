---
stepsCompleted: [1, 2]
inputDocuments: []
session_topic: 'Comment exploiter au mieux une newsletter financière hebdomadaire riche comme nouvelle source de données dans market-signal'
session_goals: 'Explorer des directions (features, intégration, valorisation du signal)'
selected_approach: 'ai-recommended'
techniques_used: ['Question Storming', 'What If Scenarios', 'Cross-Pollination']
ideas_generated: []
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** Thomas
**Date:** 2026-03-21

## Session Overview

**Topic:** Comment exploiter au mieux une newsletter financière hebdomadaire riche comme nouvelle source de données dans market-signal
**Goals:** Explorer des directions (features, intégration, nouvelles features)

### Context Guidance

Newsletter financière hebdomadaire (ex: "Marée noire") contenant :
- Indices boursiers avec % de variation hebdomadaire
- Tops/Flops actions Europe & US avec narratif explicatif
- Matières premières (énergie, métaux, produits agricoles)
- Analyse macro (banques centrales, taux, obligataire)
- Crypto (BTC, ETH, altcoins)

Caractéristiques distinctives vs flux RSS : synthèse curatée par un humain expert, signal pré-interprété, couverture multi-assets, causalités inter-secteurs expliquées, données quantifiées (% variations).

### Session Setup

Approche : AI-Recommended Techniques
Séquence : Question Storming → What If Scenarios → Cross-Pollination

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Nouvelle source de données structurellement différente des flux RSS dans un système de scoring par décroissance temporelle

**Recommended Techniques:**
- **Question Storming:** Cartographier l'espace du problème avant de générer des solutions — la newsletter est unique, il faut comprendre ses particularités
- **What If Scenarios:** Explorer des directions radicales sans contraintes — parfait pour "explorer des directions"
- **Cross-Pollination:** Chercher comment d'autres produits/industries exploitent des publications périodiques riches

---

## Idées générées

**[Intégration #1]** : Trieur LLM à 3 sorties
_Concept_ : Le LLM ingère la newsletter et produit trois types de sorties : (1) faits non captés par les RSS → `news_impacts` PUNCTUAL classiques, (2) signaux structurels sectoriels → `news_impacts` STRUCTURAL, (3) contextes macro/géopolitiques multi-secteurs → nouvelle table `macro_signals`.
_Novelty_ : La newsletter n'est pas traitée comme une source de news parmi d'autres mais comme un document à désassembler intelligemment selon la nature de chaque élément.

**[Modèle #2]** : Table `macro_signals`
_Concept_ : Nouvelle table stockant des signaux cross-secteurs (géopolitique, macro, banques centrales). Pas de `sector` unique mais un tableau de secteurs impactés. Pas de decay. Read model indépendant lu directement par le dashboard.
_Novelty_ : Sépare les signaux systémiques des signaux sectoriels — hiérarchie micro (`news_impacts`) / agrégé (`sector_scores`) / systémique (`macro_signals`).

**[Dashboard #3]** : "Wall of forces" — Vents favorables / Vents contraires
_Concept_ : Panel sur le dashboard affichant les grandes forces structurelles du moment. Ex: 🔴 Tensions Moyen-Orient · Énergie, Transport · 🟢 Boom infra IA · Tech, Semi-conducteurs. Survoler un signal highlighte les secteurs impactés dans la grille.
_Novelty_ : Donne du sens aux scores — transforme market-signal d'un outil de chiffres en outil de lecture du marché.

**[Architecture #4]** : Injection vs Émergence
_Concept_ : Deux philosophies pour détecter les macro signaux. Injection = newsletter → LLM extrait → injecte (top-down, curatée). Émergence = job hebdo qui analyse l'event store existant et fait remonter les thèmes latents (bottom-up, data-driven). La newsletter devient signal de validation de l'émergence.
_Novelty_ : L'event store est déjà un gisement de macro signaux — les faire émerger plutôt que les injecter.

**[Détection #5]** : Critères fréquence / persistance / transversalité
_Concept_ : Un macro signal est validé si : fréquence (thème présent dans beaucoup de news_impacts sur une courte période), persistance (présent sur plusieurs semaines), transversalité (affecte 3+ secteurs).
_Novelty_ : Critères objectifs et mesurables, dérivables directement de l'event store.

**[Technique #6]** : Filtrage par poids de décroissance avant le job LLM
_Concept_ : Avant d'envoyer les news_impacts au LLM pour la détection macro, appliquer le modèle de décroissance existant. Ignorer les impacts dont le poids résiduel est sous un seuil (ex: < 5%). Pas de filtre arbitraire par date — le decay fait le tri naturellement. Une news structurelle de 2 mois survit ; une ponctuelle d'une semaine est déjà filtrée.
_Novelty_ : Réutilise la logique domaine existante comme mécanisme de pertinence temporelle. Cohérent et élégant.

**[Détection #7]** : Détection de nouveauté par non-clustering
_Concept_ : Un news_impact qui n'entre dans aucun cluster thématique existant = signal embryonnaire d'un nouveau macro thème. Détecter l'émergence avant que ça devienne évident.
_Novelty_ : Détection proactive vs réactive.

**[Modèle #8b]** : Correction — multi-secteurs déjà géré
_Concept_ : Le modèle `news → N news_impacts` (un par secteur) est déjà en place. `sectors_secondary` n'est donc pas nécessaire. L'embedding se calcule au niveau `news_impact` (granularité sectorielle) et non au niveau `news`.
_Novelty_ : L'architecture existante est déjà correcte sur ce point.

**[Correction #8]** : Recalcul par cluster sur contradiction sémantique
_Concept_ : Chaque news_impact reçoit un embedding et est assigné à un cluster thématique. Quand un nouveau news_impact STRUCTURAL à fort score arrive dans un cluster existant, on compare le signe du score : même signe = confirmation (accumulation normale) ; signe opposé = contradiction probable → recalcul ciblé des sector_scores des secteurs du cluster, en neutralisant les impacts de direction opposée. Pas de LLM pour détecter la contradiction — le clustering + l'arithmétique des signes suffisent.
_Novelty_ : Mécanisme de correction des faits rétractés sans LLM supplémentaire ni compensating events explicites. Le cluster est le lien de relation entre événements. Recalcul rare en pratique (seulement déclenché par STRUCTURAL + score élevé + signe opposé).

**[Qualité #9b]** : Boucle de confiance — fetch article complet pour low-confidence
_Concept_ : Chaque news_impact reçoit un `confidence_score` (0-1) au moment de la classification LLM sur le titre. Job quotidien : prendre les 10 news_impacts avec le score de confiance le plus bas → fetcher l'article complet depuis la source RSS → relancer la classification LLM avec le texte complet → mettre à jour confidence + éventuellement score/type. Coût fixe et maîtrisé.
_Novelty_ : Boucle qualité auto-régulée à coût fixe. Détecte aussi les sources structurellement mauvaises (titres clickbait → low confidence systématique → signal de fiabilité de la source).

**[Métadonnées #9c]** : Geographic scope + country/region codes
_Concept_ : Ajouter `geographic_scope` (local/regional/global) + `country_codes` + `regions` à chaque news_impact. Pas exploité en priorité mais fondation pour la personnalisation future : un utilisateur en France voit les scores pondérés par pertinence géographique. Combiné aux embeddings, permet de filtrer un cluster thématique par scope géo sans perdre la relation sémantique.
_Novelty_ : Champ peu coûteux à extraire maintenant (LLM le fait naturellement), très coûteux à retrofitter plus tard. Débloque personnalisation utilisateur et pertinence contextuelle.

**[Qualité #9e]** : Détection de fiabilité des sources
_Concept_ : Table `source_reliability` calculée hebdomadairement. Trois signaux cumulables : (1) `avg_confidence` — moyenne glissante du confidence_score des news_impacts de la source sur 30 jours ; (2) `correction_rate` — % d'articles reclassifiés après fetch complet (titre trompeur vs contenu réel) ; (3) corroboration inter-sources — impact non confirmé par aucune autre source dans 48h (nécessite embeddings, étape 4). Le `source_reliability_score` devient un multiplicateur sur le poids des news_impacts dans le calcul de décroissance. Exposable à l'utilisateur comme UI de gestion des sources.
_Novelty_ : Fiabilité des sources mesurée objectivement à partir du comportement observé, pas de jugement a priori. Boucle d'amélioration continue de la qualité des données.

**[Qualité #9f]** : Source quality — fiabilité + pertinence + couverture sectorielle
_Concept_ : Table `source_quality` avec deux axes distincts : (1) Fiabilité = avg_confidence + correction_rate (la source dit-elle des choses vraies ?) ; (2) Pertinence = signal_rate = % d'articles avec |score| > seuil (la source dit-elle des choses utiles ?). Une source "John a léché son coiffeur" — confidence 95%, score 0.02 — pertinence nulle mais fiabilité ok. + `sector_coverage` = distribution normalisée des secteurs impactés par cette source, calculée gratuitement depuis l'event store.
_Novelty_ : Sépare fiabilité (mensonge ?) et pertinence (bruit ?) — deux problèmes distincts avec des solutions distinctes.

**[Dashboard #9g]** : UI de gestion des sources avec radar sectoriel (étape 6)
_Concept_ : Chaque flux RSS = une carte avec score de qualité (fiabilité + pertinence), radar sectoriel (couverture par secteur), toggle actif/inactif. L'utilisateur voit d'un coup d'œil quelles sources couvrent ses secteurs cibles et peut arbitrer. Fondation pour modèle freemium : 5 sources gratuites généralistes, sources spécialisées payantes. La UI montre ce qu'on rate avec les sources gratuites → argument de vente naturel.
_Novelty_ : Curation intelligente du portefeuille de données. Transforme un paramètre technique (liste de flux RSS) en décision utilisateur éclairée. Feature produit — arrive après les fondations techniques.

**[Roadmap finale]** :
```
Étape 1 — Embeddings (fondation)
Étape 2 — Métadonnées enrichies (confidence_score, geographic_scope, country_codes)
Étape 3 — Boucle qualité confiance (top-10 low-confidence → fetch article complet)
Étape 4 — Source quality (fiabilité + pertinence + sector_coverage)
Étape 5 — Clustering & macro_signals (wall of forces, correction contradictions)
Étape 6 — Personnalisation géo
Étape 7 — UI gestion des sources + freemium
```

**[Priorité #9d]** : Embeddings = infrastructure priorité #1
_Concept_ : Les embeddings ne sont pas une feature — c'est la fondation qui débloque clustering, correction de contradictions, macro_signals émergents, et personnalisation géographique. À construire avant d'exploiter les métadonnées enrichies.
_Novelty_ : Un embedding par news_impact (niveau sectoriel, pas par news brute).

**[Propriété #9]** : Indicateur de consensus / divergence par cluster
_Concept_ : Un cluster avec impacts de signes homogènes = tendance confirmée. Un cluster avec impacts de signes opposés = thème en tension, instable. Disponible gratuitement en analysant la composition de chaque cluster.
_Novelty_ : Méta-information sur la fiabilité d'un macro signal — pas juste "quel est le signal" mais "à quel point ce signal fait consensus".
