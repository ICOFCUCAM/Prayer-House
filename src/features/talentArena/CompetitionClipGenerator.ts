import { generateClips, getEntryClips, updateClipRankingScore } from '@/pipelines/competition/ClipWorker';

// ── CompetitionClipGenerator ──────────────────────────────────
// Facade over ClipWorker for use in TalentArena feature modules.

export async function generateAndRankClips(entryId: string, videoUrl: string): Promise<void> {
  await generateClips(entryId, videoUrl);
  await updateClipRankingScore(entryId);
}

export { getEntryClips, updateClipRankingScore };
