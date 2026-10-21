export function placeKey(surgeon) {
  return (surgeon?.facility || '').trim();
}

export function archivePlace(book, place, archived = true) {
  return {
    ...book,
    surgeons: (book?.surgeons || []).map(surgeon => (
      !surgeon.demo && placeKey(surgeon) === place ? { ...surgeon, archived } : surgeon
    )),
  };
}

export function deletePlace(book, place) {
  const ids = new Set(
    (book?.surgeons || []).filter(surgeon => !surgeon.demo && placeKey(surgeon) === place).map(surgeon => surgeon.id),
  );
  return {
    ...book,
    surgeons: (book?.surgeons || []).filter(surgeon => !ids.has(surgeon.id)),
    procedures: (book?.procedures || []).filter(procedure => !ids.has(procedure.surgeonId)),
  };
}
