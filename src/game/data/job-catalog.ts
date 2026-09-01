import type { JobId } from '../profile/types';

export const JOB_LABELS_KO = Object.freeze<Record<JobId, string>>({
  novice: '초보자',
  rogue: '로그',
  assassin: '어쌔신',
  hermit: '허밋',
  hokage: '호카게'
});

export function getJobLabel(jobId: JobId): string {
  return JOB_LABELS_KO[jobId];
}
