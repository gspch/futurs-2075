// Processus ouvrier : reçoit des tâches, renvoie des agrégats.
import { executer, type Tache } from './taches';

process.on('message', (msg: { id: number; tache: Tache }) => {
  try {
    const agregat = executer(msg.tache);
    process.send!({ id: msg.id, agregat });
  } catch (err) {
    process.send!({ id: msg.id, erreur: String((err as Error).stack ?? err) });
  }
});
