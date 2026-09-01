import { describe, expect, it } from 'vitest';
import { acceptJobExam, recordJobExamKill, reportJobExam, createDefaultQuestState } from '../../src/game/quests/quest-rules';

describe('전직 시험 상태 머신', () => {
  it('수락, 목표 처치, 보고 순서를 건너뛸 수 없다', () => {
    const initial = createDefaultQuestState();
    expect(reportJobExam(initial, 'novice', 10).ok).toBe(false);
    const accepted = acceptJobExam(initial, 'novice', 10);
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    let state = accepted.state;
    for (let index = 0; index < 5; index += 1) state = recordJobExamKill(state, 'green-mushroom');
    expect(reportJobExam(state, 'novice', 10)).toMatchObject({ ok: true, nextJob: 'rogue' });
  });
});
