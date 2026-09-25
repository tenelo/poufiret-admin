/** Date relative simple (à l'instant / il y a N min / il y a N h / il y a N j / date), ou "—". */
export function formaterDateRelative(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffJ = Math.floor(diffH / 24);
  if (diffJ < 7) return `il y a ${diffJ} j`;
  return new Date(iso).toLocaleDateString('fr-FR');
}
