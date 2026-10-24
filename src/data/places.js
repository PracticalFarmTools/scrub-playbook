export function placeKey(surgeon) {
  return (surgeon?.facility || '').trim();
}

/** A place name can hold an active group and an archived group. Each action touches one. */
export function inPlaceGroup(surgeon, place, archived) {
  return !surgeon?.demo && placeKey(surgeon) === place && Boolean(surgeon?.archived) === Boolean(archived);
}

export function archivePlace(book, place, archived = true) {
  return {
    ...book,
    surgeons: (book?.surgeons || []).map(surgeon => (
      inPlaceGroup(surgeon, place, !archived) ? { ...surgeon, archived, updatedAt: new Date().toISOString() } : surgeon
    )),
  };
}

export function deletePlace(book, place, { archived = false } = {}) {
  const ids = new Set(
    (book?.surgeons || []).filter(surgeon => inPlaceGroup(surgeon, place, archived)).map(surgeon => surgeon.id),
  );
  return {
    ...book,
    surgeons: (book?.surgeons || []).filter(surgeon => !ids.has(surgeon.id)),
    procedures: (book?.procedures || []).filter(procedure => !ids.has(procedure.surgeonId)),
  };
}

export function countLine(surgeons, procedures, joiner = ' · ') {
  return `${surgeons} ${surgeons === 1 ? 'surgeon' : 'surgeons'}${joiner}${procedures} ${procedures === 1 ? 'procedure' : 'procedures'}`;
}
