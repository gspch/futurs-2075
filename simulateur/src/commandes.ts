// Commandes annexes du simulateur (complétées au fil du projet).
export const COMMANDES: Record<string, (o: Record<string, string>, reste: string[]) => Promise<void>> = {};
