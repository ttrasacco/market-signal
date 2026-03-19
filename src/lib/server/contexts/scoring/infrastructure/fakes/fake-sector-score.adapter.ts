import type { Sector } from '$lib/server/contexts/news/domain/sector';
import type { SectorScoreRepositoryPort } from '../../application/ports/sector-score.repository.port';
import type { SectorScore } from '../../domain/sector-score';

export class FakeSectorScoreAdapter implements SectorScoreRepositoryPort {
	public scores: Map<string, SectorScore> = new Map();

	private key(score: SectorScore): string {
		return `${score.date.toISOString()}-${score.sector}`;
	}

	async upsert(score: SectorScore): Promise<void> {
		this.scores.set(this.key(score), score);
	}

	async findLatest(_: Sector): Promise<SectorScore> {
		if (this.scores.size === 0) throw new Error('No scores found');
		const all = Array.from(this.scores.values());
		const maxTime = Math.max(...all.map((s) => s.date.getTime()));
		return all.filter((s) => s.date.getTime() === maxTime)[0];
	}

	async findHistory(_: Sector): Promise<SectorScore[]> {
		return Array.from(this.scores.values());
	}
}
