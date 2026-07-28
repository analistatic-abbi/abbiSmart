export function countryFlagUrl(nombre: string | null | undefined, width = 40): string {
  const key = (nombre ?? '').toLowerCase().replace('ú', 'u');
  if (key.includes('colombia')) return `https://flagcdn.com/w${width}/co.png`;
  if (key.includes('peru')) return `https://flagcdn.com/w${width}/pe.png`;
  return `https://flagcdn.com/w${width}/un.png`;
}

export function countryIsoCode(nombre: string | null | undefined): string {
  const key = (nombre ?? '').toLowerCase().replace('ú', 'u');
  if (key.includes('colombia')) return 'CO';
  if (key.includes('peru')) return 'PE';
  return '';
}
