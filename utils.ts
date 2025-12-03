export const getFormattedDateTime = (date: Date = new Date()): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
};

export const formatDisplayDate = (isoString: string): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('pt-BR');
};