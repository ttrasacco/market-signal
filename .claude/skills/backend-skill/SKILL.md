---
name: backend-skill
description: Ce fichier est à utiliser quand on travaille sur tout ce qui se trouve dans src/lib/server/.
---
Règles par couche
domain/

Zéro import depuis infrastructure, application, ou SvelteKit
Ports = interfaces TypeScript uniquement, jamais des classes concrètes
Value Objects = immutables, pas de setters
Domain Services = fonctions pures

typescript// ✅ domain/scoring/decay-model.ts
export function computeDecayedScore(impacts: NewsImpact[], referenceDate: Date, lambda: number): number {
  return impacts.reduce((sum, impact) => {
    const deltaDays = (referenceDate.getTime() - impact.publishedAt.getTime()) / 86400000;
    return sum + impact.score * Math.exp(-lambda * deltaDays);
  }, 0);
}
application/use-cases/

Une classe, une méthode execute()
Dépendances injectées via constructeur uniquement
Zéro logique métier — orchestre uniquement

typescriptexport class ComputeDailyScoresUseCase {
  constructor(
    private readonly newsImpactRepo: NewsImpactRepositoryPort,
    private readonly sectorScoreRepo: SectorScoreRepositoryPort
  ) {}

  async execute(date: Date): Promise<void> {
    const impacts = await this.newsImpactRepo.findAll();
    const score = computeDecayedScore(impacts, date, 0.1);
    await this.sectorScoreRepo.save({ date, score });
  }
}
infrastructure/

Toujours implements XxxPort
Seul endroit où on importe le client DB ou le SDK Anthropic
Erreurs techniques catchées ici, transformées en erreurs domaine

typescriptexport class NewsImpactRepository implements NewsImpactRepositoryPort {
  async findAll(): Promise<NewsImpact[]> { /* requête DB */ }
}

Câblage dans les routes
typescript// routes/api/scores/+server.ts
export const GET = async () => {
  const useCase = new ComputeDailyScoresUseCase(
    new NewsImpactRepository(),
    new SectorScoreRepository()
  );
  return json(await useCase.execute(new Date()));
};