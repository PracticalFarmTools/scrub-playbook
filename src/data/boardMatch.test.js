import { describe, expect, it } from 'vitest';
import { boardProblemText, cleanAliases, matchSurgeons, parseBoard, personMatch, procedureMatch, procedureTextMatch } from './boardMatch';
import { emptyProcedure } from './schema';
import { findPhiInProcedure } from './phi';
import { parseImport, shareMessage } from './share';
import { resolveTodayTap } from './today';

describe('surgeon names on the board', () => {
  it('reads last name, LAST, FIRST, initials, and credentials', () => {
    expect(personMatch('Dr. Amy Chen', 'CHEN, AMY')).toBe('exact');
    expect(personMatch('Amy Chen', 'Chen, Amy MD')).toBe('exact');
    expect(personMatch('Dr. Amy Chen', 'Chen')).toBe('last');
    expect(personMatch('Dr. Amy Chen', 'Dr. Chen')).toBe('last');
    expect(personMatch('Amy Chen', 'A. Chen')).toBe('name');
    expect(personMatch('Amy Chen', 'Chen, A')).toBe('name');
    expect(personMatch('Maria de la Cruz', 'de la Cruz')).toBe('last');
    expect(personMatch('Amy Chen', 'Brian Chen')).toBeNull();
    expect(personMatch('Anne', 'Ann')).toBeNull();
    expect(personMatch('Dr. Do', 'Do')).toBe('exact');
  });

  it('keeps the best match and asks when two surgeons share it', () => {
    const amy = { id: 'a', name: 'Dr. Amy Chen' };
    const brian = { id: 'b', name: 'Dr. Brian Chen' };
    expect(matchSurgeons([amy, brian], 'Chen').map(s => s.id)).toEqual(['a', 'b']);
    expect(matchSurgeons([amy, brian], 'Chen, Amy').map(s => s.id)).toEqual(['a']);
    expect(matchSurgeons([amy, { id: 'c', name: 'Chen' }], 'Amy Chen').map(s => s.id)).toEqual(['a']);
  });
});

describe('procedure names on the board', () => {
  it('spells out abbreviations and never crosses sides', () => {
    expect(procedureTextMatch('Right total knee arthroplasty', 'R TKA')).toBe('exact');
    expect(procedureTextMatch('Right total knee replacement', 'Rt. TKA')).toBe('exact');
    expect(procedureTextMatch('Right TKA', 'Left TKA')).toBeNull();
    expect(procedureTextMatch('Right TKA', 'Bilateral TKA')).toBeNull();
    expect(procedureTextMatch('Right TKA', 'TKA')).toBe('partial');
    expect(procedureTextMatch('TKA', 'L TKA')).toBe('exact');
    expect(procedureTextMatch('Laparoscopic cholecystectomy', 'Lap chole')).toBe('exact');
    expect(procedureTextMatch('Irrigation and debridement', 'I&D')).toBe('exact');
    expect(procedureTextMatch('Exploratory laparotomy', 'Ex-lap')).toBe('exact');
    expect(procedureTextMatch('TAH BSO', 'Total abdominal hysterectomy, bilateral salpingo-oophorectomy')).toBe('exact');
    expect(procedureTextMatch('TKA', 'Total knee')).toBe('partial');
    expect(procedureTextMatch('Knee arthroscopy', 'Knee')).toBeNull();
    expect(procedureTextMatch('ACL reconstruction', 'ACL recon')).toBe('exact');
    expect(procedureTextMatch('Knee scope', 'Knee arthroscopy')).toBe('exact');
  });

  it('matches a card by its board names', () => {
    const card = { name: 'Anterior hip', approach: '', aliases: ['DAA THA', 'anterior approach hip'] };
    expect(procedureMatch(card, 'DAA THA')).toBe('exact');
    expect(procedureMatch(card, 'Knee')).toBeNull();
    expect(cleanAliases(' DAA THA, daa tha ,,  Hip  ')).toEqual(['DAA THA', 'Hip']);
  });

  it('shares board names with the card and checks them for patient details', () => {
    const procedure = emptyProcedure('x', { name: 'Anterior hip', aliases: ['DAA THA'] });
    const { message } = shareMessage({ name: 'Dr. Chen', specialty: 'Orthopedics' }, procedure);
    expect(parseImport(message).book.procedures[0].aliases).toEqual(['DAA THA']);
    expect(findPhiInProcedure({ ...procedure, aliases: ['Mr. Smith hip'] }).length).toBeGreaterThan(0);
  });
});

describe('board taps', () => {
  const amy = { id: 'a', name: 'Dr. Amy Chen', specialty: 'Orthopedics', demo: false };
  const right = emptyProcedure('a', { id: 'r', name: 'Right TKA' });
  const left = emptyProcedure('a', { id: 'l', name: 'Left TKA' });

  it('opens one card for LAST, FIRST and an abbreviation with the same side', () => {
    const result = resolveTodayTap({ surgeons: [amy], procedures: [right, left] }, { surgeonName: 'CHEN, AMY', procedureName: 'R total knee arthroplasty' });
    expect(result.action).toBe('open');
    expect(result.procedure.id).toBe('r');
  });

  it('starts a new card instead of opening the other side', () => {
    const result = resolveTodayTap({ surgeons: [amy], procedures: [right] }, { surgeonName: 'Chen', procedureName: 'Lt TKA' });
    expect(result.action).toBe('start-procedure');
  });

  it('asks which card when the board names no side', () => {
    const result = resolveTodayTap({ surgeons: [amy], procedures: [right, left] }, { surgeonName: 'Chen', procedureName: 'TKA' });
    expect(result).toMatchObject({ action: 'choose', closest: true });
    expect(result.procedures.map(p => p.id).sort()).toEqual(['l', 'r']);
    const single = resolveTodayTap({ surgeons: [amy], procedures: [right] }, { surgeonName: 'Chen', procedureName: 'TKA' });
    expect(single).toMatchObject({ action: 'choose', closest: true });
  });

  it('opens a card through its board name', () => {
    const hip = emptyProcedure('a', { id: 'h', name: 'Anterior hip', aliases: ['DAA THA'] });
    expect(resolveTodayTap({ surgeons: [amy], procedures: [hip] }, { surgeonName: 'Chen, A', procedureName: 'daa tha' }).procedure.id).toBe('h');
  });
});

describe('pasting the board', () => {
  const surgeons = [{ id: 'a', name: 'Dr. Amy Chen' }, { id: 'b', name: 'Raj Patel' }];

  it('reads tabs, pipes, wide spaces, and one plain line', () => {
    const lines = parseBoard([
      'Time\tRoom\tSurgeon\tProcedure',
      '07:30\tOR 4\tCHEN, AMY\tR TKA',
      '0915 | Rm 12 | Dr. Patel | Lap chole',
      '1:00 pm    OR 3    Patel    Ex-lap',
      '7:30a OR 5 Chen Left knee arthroscopy, ACL recon',
    ].join('\n'), surgeons);
    expect(lines.map(line => line.item)).toEqual([
      { startsAt: '07:30', room: '4', surgeonName: 'CHEN, AMY', procedureName: 'R TKA' },
      { startsAt: '09:15', room: '12', surgeonName: 'Dr. Patel', procedureName: 'Lap chole' },
      { startsAt: '13:00', room: '3', surgeonName: 'Patel', procedureName: 'Ex-lap' },
      { startsAt: '07:30', room: '5', surgeonName: 'Chen', procedureName: 'Left knee arthroscopy, ACL recon' },
    ]);
    expect(lines.every(line => line.problems.length === 0)).toBe(true);
  });

  it('keeps a side word after a comma with the procedure', () => {
    const [line] = parseBoard('0800 OR 2 Dr. Chen, Rt TKA', surgeons);
    expect(line.item).toMatchObject({ surgeonName: 'Dr. Chen', procedureName: 'Rt TKA' });
    expect(line.problems).toEqual([]);
  });

  it('leaves out lines that look like they carry a patient detail', () => {
    const lines = parseBoard([
      '07:30\tOR 4\tSMITH, JOHN\tCHEN, AMY\tR TKA',
      '0800 OR 2 Dr. Chen SMITH, JOHN R TKA',
      '0900 OR 3 Dr. Patel 67 yo lap chole',
      '1000 OR 1 Dr. Patel MRN 12345678 lap chole',
      '1100 OR 6 lap chole',
    ].join('\n'), surgeons);
    expect(lines.map(line => boardProblemText(line.problems))).toEqual([
      'Left out: this line may carry a patient detail.',
      'Left out: this line may carry a patient detail.',
      'Left out: this line may carry a patient detail.',
      'Left out: this line may carry a patient detail.',
      'Left out: no surgeon found. Add it by hand.',
    ]);
  });

  it('does not take a procedure written backwards for a patient name', () => {
    const [line] = parseBoard('0730 OR 4 Dr. Chen Arthroscopy, Knee', surgeons);
    expect(line.problems).toEqual([]);
    expect(line.item.procedureName).toBe('Arthroscopy, Knee');
  });
});
