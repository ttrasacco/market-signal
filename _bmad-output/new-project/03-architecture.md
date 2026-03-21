# Architecture

## Principle: Hexagonal + DDD + CQRS

**Dependency rule: inward only.**
Domain knows nothing about infrastructure, NestJS, or the database.

```
src/
├── modules/
│   ├── news/
│   │   ├── domain/
│   │   │   ├── news.entity.ts
│   │   │   ├── news-impact.entity.ts
│   │   │   ├── impact-type.enum.ts
│   │   │   └── sector.enum.ts
│   │   ├── application/
│   │   │   ├── ports/
│   │   │   │   ├── news.repository.port.ts
│   │   │   │   ├── news-impact.repository.port.ts
│   │   │   │   └── news-classifier.port.ts
│   │   │   ├── commands/
│   │   │   │   └── ingest-news.command.ts + handler
│   │   │   └── queries/
│   │   │       └── get-news-impacts.query.ts + handler
│   │   ├── infrastructure/
│   │   │   ├── db/
│   │   │   │   ├── news.repository.ts
│   │   │   │   ├── news-impact.repository.ts
│   │   │   │   └── news.schema.ts
│   │   │   ├── llm/
│   │   │   │   └── anthropic-classifier.ts
│   │   │   └── fakes/
│   │   │       ├── fake-news.repository.ts
│   │   │       └── fake-news-classifier.ts
│   │   └── news.module.ts
│   │
│   ├── scoring/
│   │   ├── domain/
│   │   │   ├── sector-score.entity.ts
│   │   │   └── decay-model.ts
│   │   ├── application/
│   │   │   ├── ports/
│   │   │   │   ├── sector-score.repository.port.ts
│   │   │   │   └── news-impact.read.port.ts
│   │   │   ├── commands/
│   │   │   │   └── compute-daily-scores.command.ts + handler
│   │   │   └── queries/
│   │   │       └── get-latest-sector-scores.query.ts + handler
│   │   ├── infrastructure/
│   │   │   ├── db/
│   │   │   │   ├── sector-score.repository.ts
│   │   │   │   └── sector-score.schema.ts
│   │   │   └── fakes/
│   │   │       └── fake-sector-score.repository.ts
│   │   └── scoring.module.ts
│   │
│   ├── embeddings/                        ← Étape 1
│   │   ├── domain/
│   │   │   └── embedding.entity.ts
│   │   ├── application/
│   │   │   ├── ports/
│   │   │   │   └── embedding.provider.port.ts
│   │   │   └── commands/
│   │   │       └── compute-embedding.command.ts + handler
│   │   ├── infrastructure/
│   │   │   ├── db/
│   │   │   │   └── pgvector.adapter.ts
│   │   │   └── llm/
│   │   │       └── anthropic-embedding.provider.ts
│   │   └── embeddings.module.ts
│   │
│   ├── source-quality/                    ← Étapes 3 & 4
│   │   ├── domain/
│   │   │   └── source-quality.entity.ts
│   │   ├── application/
│   │   │   ├── commands/
│   │   │   │   ├── fetch-low-confidence-articles.command.ts + handler
│   │   │   │   └── compute-source-quality.command.ts + handler
│   │   │   └── queries/
│   │   │       └── get-source-quality.query.ts + handler
│   │   ├── infrastructure/
│   │   │   ├── db/
│   │   │   │   └── source-quality.repository.ts
│   │   │   └── http/
│   │   │       └── article-fetcher.ts
│   │   └── source-quality.module.ts
│   │
│   ├── macro-signals/                     ← Étape 5
│   │   ├── domain/
│   │   │   └── macro-signal.entity.ts
│   │   ├── application/
│   │   │   ├── commands/
│   │   │   │   └── compute-macro-signals.command.ts + handler
│   │   │   └── queries/
│   │   │       └── get-active-macro-signals.query.ts + handler
│   │   ├── infrastructure/
│   │   │   └── db/
│   │   │       └── macro-signal.repository.ts
│   │   └── macro-signals.module.ts
│   │
│   └── newsletter/                        ← Feature newsletter
│       ├── domain/
│       │   └── newsletter-entry.entity.ts
│       ├── application/
│       │   ├── ports/
│       │   │   └── newsletter-parser.port.ts
│       │   └── commands/
│       │       └── ingest-newsletter.command.ts + handler
│       ├── infrastructure/
│       │   └── llm/
│       │       └── anthropic-newsletter-parser.ts
│       └── newsletter.module.ts
│
├── cross-context/
│   └── pipeline/
│       ├── run-daily-pipeline.service.ts  ← orchestrates all daily jobs
│       └── pipeline.module.ts
│
├── shared/
│   └── database/
│       ├── drizzle.client.ts
│       └── pgvector.config.ts
│
└── app.module.ts
```

## CQRS pattern (NestJS)

```typescript
// Command — write side
export class IngestNewsCommand {
  constructor(public readonly sources: string[]) {}
}

@CommandHandler(IngestNewsCommand)
export class IngestNewsHandler implements ICommandHandler<IngestNewsCommand> {
  constructor(
    @Inject(NEWS_CLASSIFIER_PORT) private classifier: NewsClassifierPort,
    @Inject(NEWS_IMPACT_REPOSITORY_PORT) private repo: NewsImpactRepositoryPort,
  ) {}

  async execute(command: IngestNewsCommand): Promise<void> { ... }
}

// Query — read side
export class GetLatestSectorScoresQuery {}

@QueryHandler(GetLatestSectorScoresQuery)
export class GetLatestSectorScoresHandler implements IQueryHandler {
  async execute(): Promise<SectorScore[]> { ... }
}
```

## Dependency injection for ports

```typescript
// Port token
export const NEWS_CLASSIFIER_PORT = Symbol('NewsClassifierPort');

// Module wiring — infrastructure layer only
@Module({
  providers: [
    { provide: NEWS_CLASSIFIER_PORT, useClass: AnthropicClassifier },
    IngestNewsHandler,
  ],
})
export class NewsModule {}

// In tests — swap adapter
{ provide: NEWS_CLASSIFIER_PORT, useClass: FakeNewsClassifier }
```

## API routes (NestJS controllers)

```
GET  /api/sector-scores          ← latest scores for dashboard
GET  /api/macro-signals          ← active macro signals
GET  /api/source-quality         ← source quality list
POST /api/cron/daily             ← Vercel Cron → CRON_SECRET
POST /api/newsletter/ingest      ← manual newsletter ingestion
```
