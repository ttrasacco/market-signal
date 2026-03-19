---
name: No direct DB tests
description: Ne pas écrire de tests qui touchent la DB directement — tester via les fakes
type: feedback
---

Ne pas écrire de tests d'intégration qui font des requêtes directes à la DB.

**Why:** Bonne pratique du projet — les tests doivent être rapides et isolés, sans dépendance à une DB réelle.

**How to apply:** Pour tester la couche repository, écrire des tests unitaires sur `FakeNewsImpactRepository` (et les futurs fakes). Le `DrizzleRepository` n'est pas testé directement.
