import type { MonsterId } from '../data/monster-catalog';
import type { JobId } from '../profile/types';

export type JobExamStatus = 'none' | 'active' | 'ready';
export interface JobExamState { status: JobExamStatus; job: JobId | null; kills: number }
export interface QuestState { jobExam: JobExamState; expeditionStage: 'none' | 'midboss' | 'upperboss' | 'finalboss' | 'report' | 'complete' }

const EXAMS: Readonly<Partial<Record<JobId, { level: number; target: MonsterId; count: number; nextJob: JobId }>>> = Object.freeze({
  novice: { level: 10, target: 'green-mushroom', count: 5, nextJob: 'rogue' },
  rogue: { level: 30, target: 'shadow-sentinel', count: 6, nextJob: 'assassin' },
  assassin: { level: 60, target: 'abyss-golem', count: 3, nextJob: 'hermit' },
  hermit: { level: 120, target: 'abyss-golem', count: 8, nextJob: 'hokage' },
});

export function createDefaultQuestState(): QuestState { return { jobExam: { status: 'none', job: null, kills: 0 }, expeditionStage: 'none' }; }

export function acceptJobExam(state: QuestState, job: JobId, level: number): { ok: true; state: QuestState } | { ok: false; reason: 'unavailable' | 'active' } {
  const exam = EXAMS[job];
  if (state.jobExam.status !== 'none') return { ok: false, reason: 'active' };
  if (exam === undefined || level < exam.level) return { ok: false, reason: 'unavailable' };
  return { ok: true, state: { ...state, jobExam: { status: 'active', job, kills: 0 } } };
}

export function recordJobExamKill(state: QuestState, monsterId: MonsterId): QuestState {
  if (state.jobExam.status !== 'active' || state.jobExam.job === null) return state;
  const exam = EXAMS[state.jobExam.job];
  if (exam === undefined || exam.target !== monsterId) return state;
  const kills = Math.min(exam.count, state.jobExam.kills + 1);
  return { ...state, jobExam: { ...state.jobExam, kills, status: kills >= exam.count ? 'ready' : 'active' } };
}

export function reportJobExam(state: QuestState, job: JobId, level: number): { ok: true; state: QuestState; nextJob: JobId } | { ok: false; reason: 'not-ready' } {
  const exam = EXAMS[job];
  if (exam === undefined || state.jobExam.status !== 'ready' || state.jobExam.job !== job || level < exam.level) return { ok: false, reason: 'not-ready' };
  return { ok: true, state: { ...state, jobExam: { status: 'none', job: null, kills: 0 } }, nextJob: exam.nextJob };
}

export function getJobExamTarget(job: JobId): { target: MonsterId; count: number } | null {
  const exam = EXAMS[job];
  return exam === undefined ? null : { target: exam.target, count: exam.count };
}
