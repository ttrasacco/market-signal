# Technical Stack

## Choices

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | Angular | Confirmed expertise, component architecture, DI |
| Backend | NestJS | Confirmed expertise, modules = bounded contexts, native DI, CQRS module |
| Language | TypeScript strict | Across the full stack |
| Database | PostgreSQL | Relational + pgvector extension for embeddings |
| ORM | Drizzle ORM | Lightweight, type-safe, SQL-first |
| Embeddings | pgvector | Vector storage and similarity search directly in PostgreSQL |
| LLM | Anthropic API (claude-sonnet) | Classification, extraction, synthesis |
| Cron | Vercel Cron (or similar) | Daily pipeline trigger |
| Tests | Vitest (unit) + Playwright (E2E) | |
| Hosting | Vercel | Serverless functions, max duration 300s |

## NestJS — why it fits DDD

```
@Module({})                          ← Bounded context boundary
class NewsModule {}

@CommandHandler(IngestNewsCommand)   ← Use case
class IngestNewsHandler {}

@EventsHandler(NewsIngestedEvent)    ← Domain event
class NewsIngestedHandler {}
```

- **Modules** map directly to DDD bounded contexts
- **`@nestjs/cqrs`** provides `CommandBus`, `QueryBus`, `EventBus` out of the box
- **Dependency injection** makes ports/adapters trivial to swap
- **Same paradigm as Angular** — decorators, modules, DI container

## pgvector — why it fits

Embeddings stored as `vector(1536)` columns directly in PostgreSQL. No separate vector database needed.

```sql
-- Similarity search
SELECT * FROM news_impacts
ORDER BY embedding <=> $1  -- cosine distance
LIMIT 20;
```

Compatible with Drizzle ORM via custom column type.

## Key environment variables

```env
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=...
CRON_SECRET=...
```
