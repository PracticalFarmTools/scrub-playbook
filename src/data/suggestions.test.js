import { describe, expect, it } from 'vitest';
import { closeSuggestion, followUpText, openSuggestion, recordSuggestion, suggestionState } from './suggestions';

const at = '2026-10-01T12:00:00.000Z';
const day = (n) => Date.parse(at) + n * 86400000;

describe('suggestion follow-up', () => {
  it('records what was sent and finds the open one for a card', () => {
    const card = { id: 'p1', surgeonId: 's1', unitBook: { id: 'u1', revision: 4 } };
    const list = recordSuggestion([], card, { seen: ' Two lap sponges ', change: 'Add a second lap pack' }, at);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ procedureId: 'p1', surgeonId: 's1', at, seen: 'Two lap sponges', change: 'Add a second lap pack', revision: 4, status: 'open' });
    expect(openSuggestion(list, 'p1')).toBe(list[0]);
    expect(openSuggestion(list, 'p2')).toBeNull();
  });

  it('does not double up when the same suggestion is copied and then shared', () => {
    const card = { id: 'p1', surgeonId: 's1' };
    let list = recordSuggestion([], card, { seen: 'a', change: 'b' }, at);
    list = recordSuggestion(list, card, { seen: 'a ', change: 'b' }, new Date(day(1)).toISOString());
    expect(list).toHaveLength(1);
    expect(list[0].at).toBe(new Date(day(1)).toISOString());
    list = recordSuggestion(list, card, { seen: 'a', change: 'c' }, new Date(day(2)).toISOString());
    expect(list).toHaveLength(2);
  });

  it('closes a suggestion as made or closed', () => {
    const list = recordSuggestion([], { id: 'p1', surgeonId: 's1' }, { seen: 'a', change: 'b' }, at);
    const made = closeSuggestion(list, list[0].id, 'made', '2026-10-05T00:00:00.000Z');
    expect(made[0]).toMatchObject({ status: 'made', closedAt: '2026-10-05T00:00:00.000Z' });
    expect(openSuggestion(made, 'p1')).toBeNull();
  });

  it('keeps the newest 200', () => {
    let list = [];
    for (let i = 0; i < 205; i += 1) list = recordSuggestion(list, { id: `p${i}`, surgeonId: 's1' }, { seen: 'a', change: 'b' }, new Date(day(i)).toISOString());
    expect(list).toHaveLength(200);
    expect(list[0].procedureId).toBe('p204');
    expect(list.at(-1).procedureId).toBe('p5');
  });

  it('says what to do next', () => {
    const personal = { id: 'p1', surgeonId: 's1', official: { reviewedAt: null } };
    const [sent] = recordSuggestion([], personal, { seen: 'a', change: 'b' }, at);
    expect(suggestionState(sent, personal, day(3))).toEqual({ kind: 'waiting', days: 3 });
    expect(followUpText(suggestionState(sent, personal, day(3)))).toBe('Check the official card for it the next time you are in this case.');
    expect(suggestionState(sent, personal, day(31))).toEqual({ kind: 'ask', days: 31 });
    expect(followUpText({ kind: 'ask', days: 31 })).toBe('Sent 31 days ago. Ask the card owner about it.');
    const checked = { ...personal, official: { reviewedAt: new Date(day(2)).toISOString() } };
    expect(suggestionState(sent, checked, day(3)).kind).toBe('checked');

    const unit = { id: 'p2', surgeonId: 's1', unitBook: { id: 'u1', revision: 4 } };
    const [unitSent] = recordSuggestion([], unit, { seen: 'a', change: 'b' }, at);
    expect(suggestionState(unitSent, unit, day(3)).kind).toBe('waiting');
    const newer = { ...unit, unitBook: { ...unit.unitBook, revision: 5 } };
    expect(suggestionState(unitSent, newer, day(3))).toEqual({ kind: 'revision', revision: 5 });
    expect(followUpText({ kind: 'revision', revision: 5 })).toBe('Unit book revision 5 came out after your suggestion. Check whether it has your change.');
    expect(suggestionState({ ...unitSent, status: 'made' }, newer)).toBeNull();
  });
});
