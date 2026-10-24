import { findPhiSignals } from './phi';

const CREDENTIALS = new Set(['md', 'do', 'dds', 'dmd', 'dpm', 'facs', 'faaos', 'phd', 'mbbs', 'pa', 'pac', 'np', 'crna', 'jr', 'sr', 'ii', 'iii']);

function nameWords(text) {
  return String(text || '').toLowerCase().replace(/[.]/g, ' ').split(/\s+/).filter(Boolean);
}

function dropTrailingCredentials(words) {
  const out = [...words];
  while (out.length > 1 && CREDENTIALS.has(out.at(-1))) out.pop();
  return out;
}

/** "Dr. Amy Chen", "CHEN, AMY", and "Chen, Amy MD" all read as first "amy", last "chen". */
export function personParts(name) {
  let text = String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  text = text.replace(/^(dr\.?|doctor)\s+/, '');
  const parts = text.split(',').map(part => part.trim()).filter(Boolean)
    .filter((part, index) => index === 0 || !nameWords(part).every(word => CREDENTIALS.has(word)));
  if (parts.length >= 2) {
    const last = dropTrailingCredentials(nameWords(parts[0]));
    const given = dropTrailingCredentials(nameWords(parts[1]).filter(word => word !== 'dr'));
    return { words: [...given, ...last], first: given[0] || '', last };
  }
  const words = dropTrailingCredentials(nameWords(parts[0] || ''));
  if (words.length <= 1) return { words, first: '', last: words };
  return { words, first: words[0], last: [words.at(-1)] };
}

function endsWith(words, tail) {
  if (!tail.length || tail.length > words.length) return false;
  return tail.every((word, index) => words[words.length - tail.length + index] === word);
}

function sameFirst(a, b) {
  if (a === b) return true;
  if (a.length === 1) return b.startsWith(a);
  if (b.length === 1) return a.startsWith(b);
  return false;
}

/**
 * How a name on the board matches a surgeon in the book: 'exact', 'name' (first name or
 * initial and last name), 'last' (last name only), or null. "Ann" does not match "Anne".
 */
export function personMatch(bookName, boardName) {
  const book = personParts(bookName);
  const board = personParts(boardName);
  if (!book.words.length || !board.words.length) return null;
  if (book.words.join(' ') === board.words.join(' ')) return 'exact';
  if (endsWith(book.words, board.words)) return 'last';
  if (!endsWith(book.words, board.last)) return null;
  const rest = book.words.slice(0, book.words.length - board.last.length);
  if (!board.first || !rest.length) return 'last';
  return sameFirst(rest[0], board.first) ? 'name' : null;
}

const PERSON_RANK = { exact: 3, name: 2, last: 1 };

/** Surgeons the board name points to, best match first. More than one means the tech chooses. */
export function matchSurgeons(surgeons, boardName) {
  const scored = (surgeons || [])
    .map(surgeon => ({ surgeon, rank: PERSON_RANK[personMatch(surgeon.name, boardName)] || 0 }))
    .filter(entry => entry.rank > 0);
  if (!scored.length) return [];
  const best = Math.max(...scored.map(entry => entry.rank));
  return scored.filter(entry => entry.rank === best).map(entry => entry.surgeon);
}

/** @type {Array<[RegExp, string]>} */
const PHRASES = [
  [/\bi\s*(?:&|and)\s*d\b/g, ' irrigation debridement '],
  [/\bd\s*(?:&|and)\s*c\b/g, ' dilation curettage '],
  [/\bex[\s-]?lap\b/g, ' exploratory laparotomy '],
  [/\bc[\s-]section\b/g, ' cesarean section '],
  [/\bb\/l\b/g, ' bilateral '],
  [/\bw\//g, ' with '],
  [/\bs\/p\b/g, ' '],
];

const ABBREVIATIONS = {
  tka: 'total knee arthroplasty',
  tkr: 'total knee arthroplasty',
  tha: 'total hip arthroplasty',
  thr: 'total hip arthroplasty',
  tsa: 'total shoulder arthroplasty',
  rsa: 'reverse shoulder arthroplasty',
  rtsa: 'reverse shoulder arthroplasty',
  uka: 'unicompartmental knee arthroplasty',
  hemi: 'hemiarthroplasty',
  replacement: 'arthroplasty',
  orif: 'open reduction internal fixation',
  crpp: 'closed reduction percutaneous pinning',
  imn: 'intramedullary nail',
  im: 'intramedullary',
  nailing: 'nail',
  fx: 'fracture',
  acdf: 'anterior cervical discectomy fusion',
  tlif: 'transforaminal lumbar interbody fusion',
  plif: 'posterior lumbar interbody fusion',
  lami: 'laminectomy',
  acl: 'anterior cruciate ligament',
  rcr: 'rotator cuff repair',
  scope: 'arthroscopy',
  arthroscopic: 'arthroscopy',
  recon: 'reconstruction',
  ctr: 'carpal tunnel release',
  lap: 'laparoscopic',
  lsc: 'laparoscopic',
  chole: 'cholecystectomy',
  appy: 'appendectomy',
  lihr: 'laparoscopic inguinal hernia repair',
  ihr: 'inguinal hernia repair',
  tah: 'total abdominal hysterectomy',
  tlh: 'total laparoscopic hysterectomy',
  bso: 'bilateral salpingo oophorectomy',
  turp: 'transurethral resection prostate',
  turbt: 'transurethral resection bladder tumor',
  egd: 'esophagogastroduodenoscopy',
  cabg: 'coronary artery bypass graft',
};

const SIDES = {
  right: 'right', rt: 'right', r: 'right', rgt: 'right',
  left: 'left', lt: 'left', l: 'left',
  bilateral: 'bilateral', bilat: 'bilateral', bil: 'bilateral', bl: 'bilateral', bilaterally: 'bilateral',
};

const STOP_WORDS = new Set(['of', 'the', 'and', 'with', 'a', 'an', 'for', 'to', 'possible', 'poss', 'procedure', 'case', 'surgery']);

/** Side words and the rest of a procedure name, with common abbreviations spelled out. */
export function procedureKey(text) {
  let value = ` ${String(text || '').toLowerCase()} `;
  for (const [pattern, replacement] of PHRASES) value = value.replace(pattern, replacement);
  const raw = value.replace(/[.,;:()[\]{}"“”'’/+-]/g, ' ').split(/\s+/).filter(Boolean);
  const expanded = raw.flatMap(word => (ABBREVIATIONS[word] ? ABBREVIATIONS[word].split(' ') : [word]));
  const sides = new Set();
  const words = new Set();
  for (const word of expanded) {
    if (SIDES[word]) sides.add(SIDES[word]);
    else if (!STOP_WORDS.has(word)) words.add(word);
  }
  return { sides: [...sides].sort().join('+'), words };
}

function isSubset(small, big) {
  for (const word of small) if (!big.has(word)) return false;
  return true;
}

/**
 * 'exact', 'partial', or null. A different side never matches. A card that names a side
 * is only 'partial' for a board line that names none, so the tech checks the side.
 */
export function procedureTextMatch(cardText, boardText) {
  const card = procedureKey(cardText);
  const board = procedureKey(boardText);
  if (!card.words.size || !board.words.size) return null;
  if (card.sides && board.sides && card.sides !== board.sides) return null;
  const same = card.words.size === board.words.size && isSubset(card.words, board.words);
  if (same) return card.sides && !board.sides ? 'partial' : 'exact';
  const [small, big] = card.words.size <= board.words.size ? [card.words, board.words] : [board.words, card.words];
  if (small.size >= 2 && isSubset(small, big)) return 'partial';
  return null;
}

const PROCEDURE_RANK = { exact: 2, partial: 1 };

export function cleanAliases(list) {
  const seen = new Set();
  return (Array.isArray(list) ? list : String(list || '').split(','))
    .map(alias => String(alias || '').trim().replace(/\s+/g, ' ').slice(0, 80))
    .filter(alias => {
      const key = alias.toLowerCase();
      if (!alias || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

/** Best match of a board procedure against a card's name, name with approach, and board names. */
export function procedureMatch(procedure, boardText) {
  const names = [
    procedure?.name,
    procedure?.approach ? `${procedure.name} ${procedure.approach}` : '',
    ...cleanAliases(procedure?.aliases),
  ].filter(Boolean);
  let best = null;
  for (const name of names) {
    const tier = procedureTextMatch(name, boardText);
    if (tier && (!best || PROCEDURE_RANK[tier] > PROCEDURE_RANK[best])) best = tier;
  }
  return best;
}

const TIME_AT_START = /^\s*(\d{1,2})(?:[:.h]?(\d{2}))\s*(am|pm|a|p)?\b/i;
const ROOM = /\b(?:or|rm|room|suite|theatre|theater)\s*#?\s*([a-z]?\d{1,3}[a-z]?)\b/i;
const AGE = /\b\d{1,3}\s?(?:y\/?o|yo|yrs?|years?\s+old)\b/i;
const COMMA_NAME = /\b([A-Za-z][A-Za-z'-]+),\s*([A-Za-z][A-Za-z'-]+)\b/g;
const BODY_WORDS = new Set(['knee', 'hip', 'shoulder', 'ankle', 'wrist', 'elbow', 'spine', 'hand', 'foot', 'hernia', 'breast', 'neck', 'back', 'finger', 'toe', 'thumb']);
const PROCEDURE_ENDING = /(ectomy|otomy|ostomy|plasty|scopy|pexy|rrhaphy|repair|fusion|release|fixation|biopsy|graft|revision|removal|injection|block)$/;

function procedureWord(word) {
  const lower = word.toLowerCase();
  return Boolean(SIDES[lower] || ABBREVIATIONS[lower] || STOP_WORDS.has(lower) || BODY_WORDS.has(lower) || PROCEDURE_ENDING.test(lower));
}

/** "SMITH, JOHN" or "Smith, John" that is not a procedure written backwards, such as "Arthroscopy, Knee". */
function commaName(text) {
  COMMA_NAME.lastIndex = 0;
  let match;
  while ((match = COMMA_NAME.exec(text))) {
    const [, last, first] = match;
    if (/^[A-Z]/.test(last) && /^[A-Z]/.test(first) && !procedureWord(last) && !procedureWord(first)) return match;
  }
  return null;
}

/** "Chen, Amy" keeps the given name; "Chen, Rt" drops a side or abbreviation that follows the comma. */
function withoutProcedureTail(match) {
  const text = match[0];
  const comma = /\s*,\s*([A-Za-z][A-Za-z'-]+)$/.exec(text);
  if (comma && procedureWord(comma[1])) return { index: match.index, text: text.slice(0, comma.index) };
  return { index: match.index, text };
}
const HEADER = /^(?:time|start|room|or|surgeon|procedure|case)\b/i;

function readTime(text) {
  const match = TIME_AT_START.exec(text);
  if (!match) return { time: '', rest: text };
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = (match[3] || '').toLowerCase();
  if (meridiem.startsWith('p') && hour < 12) hour += 12;
  if (meridiem.startsWith('a') && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return { time: '', rest: text };
  return {
    time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    rest: text.slice(match[0].length),
  };
}

function readRoom(text) {
  const match = ROOM.exec(text);
  if (!match) return { room: '', rest: text };
  return { room: match[1].toUpperCase(), rest: `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}` };
}

function tidy(text) {
  return String(text || '').replace(/\s+/g, ' ').replace(/^[\s\-–—|:·,]+|[\s\-–—|:·,]+$/g, '').trim();
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findSurgeon(text, surgeons) {
  const hit = (match) => {
    const { index, text: name } = withoutProcedureTail(match);
    return { name: tidy(name), index, length: name.length };
  };
  const doctor = /\b(?:dr\.?|doctor)\s+[A-Za-z][A-Za-z'-]+(?:\s*,\s*[A-Za-z][A-Za-z'-]+)?/i.exec(text);
  if (doctor) return hit(doctor);
  let found = null;
  for (const surgeon of surgeons || []) {
    const last = personParts(surgeon.name).last.join(' ');
    if (!last) continue;
    const pattern = new RegExp(`\\b${escapeRegExp(last)}\\b(?:\\s*,\\s*[A-Za-z][A-Za-z'-]+)?`, 'i');
    const match = pattern.exec(text);
    if (match && (!found || match.index < found.index)) found = hit(match);
  }
  if (found) return found;
  const comma = commaName(text);
  return comma ? hit(comma) : null;
}

function columnsOf(line) {
  if (line.includes('\t')) return line.split('\t');
  if (line.includes('|')) return line.split('|');
  if (/\S\s{2,}\S/.test(line)) return line.split(/\s{2,}/);
  return null;
}

function parseLine(line, surgeons) {
  const problems = [];
  if (findPhiSignals(line).length) problems.push('phi');
  if (AGE.test(line)) problems.push('patient');

  let startsAt = '';
  let room = '';
  let surgeonName = '';
  let procedureName = '';
  const columns = columnsOf(line);
  if (columns) {
    const rest = [];
    for (const column of columns.map(tidy).filter(Boolean)) {
      const timed = readTime(column);
      if (!startsAt && timed.time && !tidy(timed.rest)) { startsAt = timed.time; continue; }
      const roomed = readRoom(column);
      if (!room && roomed.room && !tidy(roomed.rest)) { room = roomed.room; continue; }
      rest.push(column);
    }
    const people = rest.filter(column => {
      const found = findSurgeon(column, surgeons);
      return found && tidy(column.slice(0, found.index) + column.slice(found.index + found.length)) === '';
    });
    if (people.length > 1) problems.push('patient');
    surgeonName = people[0] || '';
    procedureName = tidy(rest.filter(column => column !== surgeonName && !people.includes(column)).join(' '));
  } else {
    const timed = readTime(line);
    startsAt = timed.time;
    const roomed = readRoom(timed.rest);
    room = roomed.room;
    const rest = roomed.rest;
    const found = findSurgeon(rest, surgeons);
    if (found) {
      surgeonName = found.name;
      const remaining = `${rest.slice(0, found.index)} ${rest.slice(found.index + found.length)}`;
      if (commaName(remaining)) problems.push('patient');
      procedureName = tidy(remaining);
    } else {
      procedureName = tidy(rest);
    }
  }
  if (!surgeonName) problems.push('no-surgeon');
  if (!procedureName) problems.push('no-procedure');
  return { line, item: { startsAt, room, surgeonName, procedureName }, problems: [...new Set(problems)] };
}

/** Lines pasted from the OR board, read into time, room, surgeon, and procedure. */
export function parseBoard(text, surgeons = []) {
  return String(text || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !(HEADER.test(line) && !/\d/.test(line)))
    .slice(0, 60)
    .map(line => parseLine(line, surgeons));
}

export function boardProblemText(problems) {
  if (problems.includes('phi') || problems.includes('patient')) return 'Left out: this line may carry a patient detail.';
  if (problems.includes('no-surgeon')) return 'Left out: no surgeon found. Add it by hand.';
  if (problems.includes('no-procedure')) return 'Left out: no procedure found. Add it by hand.';
  return '';
}
