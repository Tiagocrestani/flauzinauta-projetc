const naturalFileNameCollator = new Intl.Collator('pt-BR', {
  numeric: true,
  sensitivity: 'base',
});

export function compareNaturalFileNames(left: string, right: string): number {
  return naturalFileNameCollator.compare(left, right);
}
