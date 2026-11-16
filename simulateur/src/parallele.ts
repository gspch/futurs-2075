// Répartit des tâches sur plusieurs processus (un par cœur) et fusionne les agrégats.
import { fork, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { executer, type Tache } from './taches';
import { fusionner, type Agregat } from './stats';

const OUVRIER = fileURLToPath(new URL('./ouvrier.ts', import.meta.url));

export class Bassin {
  private ouvriers: ChildProcess[] = [];
  private libres: ChildProcess[] = [];
  private file: { tache: Tache; ok: (a: Agregat) => void; ko: (e: Error) => void }[] = [];
  private enCours = new Map<number, { ok: (a: Agregat) => void; ko: (e: Error) => void; w: ChildProcess }>();
  private seq = 0;
  readonly taille: number;

  constructor(taille = Math.max(1, Math.min(os.cpus().length, Number(process.env.SIM_COEURS) || os.cpus().length))) {
    this.taille = taille;
    for (let i = 0; i < taille; i++) {
      const w = fork(OUVRIER, [], { execArgv: ['--import', 'tsx'] });
      w.on('message', (msg: { id: number; agregat?: Agregat; erreur?: string }) => {
        const j = this.enCours.get(msg.id)!;
        this.enCours.delete(msg.id);
        this.libres.push(w);
        if (msg.erreur) j.ko(new Error(msg.erreur)); else j.ok(msg.agregat!);
        this.pomper();
      });
      this.ouvriers.push(w); this.libres.push(w);
    }
  }
  private pomper(): void {
    while (this.libres.length && this.file.length) {
      const w = this.libres.pop()!;
      const j = this.file.shift()!;
      const id = ++this.seq;
      this.enCours.set(id, { ok: j.ok, ko: j.ko, w });
      w.send({ id, tache: j.tache });
    }
  }
  private une(tache: Tache): Promise<Agregat> {
    return new Promise((ok, ko) => { this.file.push({ tache, ok, ko }); this.pomper(); });
  }
  /** Exécute un lot en le découpant en tranches ; le résultat ne dépend pas du nombre d'ouvriers. */
  async lot(t: Omit<Tache, 'debut'>, tranche = 0): Promise<Agregat> {
    const taille = tranche || Math.max(10, Math.ceil(t.parties / (this.taille * 4)));
    const morceaux: Promise<Agregat>[] = [];
    for (let d = 0; d < t.parties; d += taille) morceaux.push(this.une({ ...t, debut: d, parties: Math.min(taille, t.parties - d) }));
    const res = await Promise.all(morceaux);
    const a: Agregat = {};
    for (const r of res) fusionner(a, r);
    return a;
  }
  fermer(): void { for (const w of this.ouvriers) w.kill(); }
}

export function lotLocal(t: Omit<Tache, 'debut'>): Agregat { return executer({ ...t, debut: 0 }); }
