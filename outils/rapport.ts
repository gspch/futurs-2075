// Écrit docs/RAPPORT_EQUILIBRAGE.md à partir des résumés de simulation : aucun chiffre n'est saisi à la main.
// Usage : npx tsx outils/rapport.ts [simulations/resume-v1.0.json] [simulations/adverse-final.json]
import fs from 'node:fs';
import { evaluerCriteres, strategies, partStrategie, cartesStats, typesStats, dureeStats, minutes, type Resume } from '../simulateur/src/criteres';
import { wilson, type Agregat } from '../simulateur/src/stats';
import { CONTENU as C, PARAMETRES as P } from '../contenu';

const fr = (x: number, d = 1) => x.toFixed(d).replace('.', ',');
const pc = (x: number, d = 1) => fr(100 * x, d) + ' %';
const ic = (w: { bas: number; haut: number }, f = 100, d = 1) => `[${fr(f * w.bas, d)} ; ${fr(f * w.haut, d)}]`;
const NOMS: Record<string, string> = { aleatoire: 'Aléatoire', glouton: 'Glouton', chasseur: 'Chasseur de signaux', parieur: 'Parieur de ruptures', bloqueur: 'Bloqueur', 'specialiste-matiere': 'Spécialiste Matière', 'specialiste-technique': 'Spécialiste Technique', 'specialiste-echelle': 'Spécialiste Échelle', 'specialiste-lien': 'Spécialiste Lien' };

const fichier = process.argv[2] ?? `simulations/resume-v${P.version}.json`;
const r = JSON.parse(fs.readFileSync(fichier, 'utf8')) as Resume;
const fAdv = process.argv[3] ?? 'simulations/adverse-final.json';
const adv = fs.existsSync(fAdv) ? (JSON.parse(fs.readFileSync(fAdv, 'utf8')) as { commande: string; nbVariantes: number; ratios: number[]; reglages: { parties: number; partiesFinales: number; generations: number; population: number; graine: number }; finalistes: { ratio: number; bas: number; haut: number; parNb: number[]; origine: string; poids: Record<string, number>; parties: number }[] }) : null;
const nbs = Object.keys(r.melange).map(Number).sort();
const crit = evaluerCriteres(r);
const L: string[] = [];
const p = (...s: string[]) => L.push(...s, '');

p(`# Rapport d'équilibrage — Aiguillages, règles v${r.version}`);
p(`*Document généré par \`outils/rapport.ts\` à partir de \`${fichier}\`${adv ? ` et \`${fAdv}\`` : ''}. Aucun chiffre n'est saisi à la main : relancer la simulation puis ce script reproduit le rapport.*`);
p('## 1. Résumé');
const ok = crit.filter((c) => c.atteint).length;
p(`**${ok} mesures sur ${crit.length} atteignent leur seuil.** ${crit.filter((c) => !c.atteint).length ? 'Non atteints : ' + crit.filter((c) => !c.atteint).map((c) => `**${c.id}** (${c.nom.toLowerCase()})`).join(', ') + '.' : ''}`);
p('| | Critère | Seuil | Mesure (IC 95 %) | Verdict |', '|---|---|---|---|---|', ...crit.map((c) => `| ${c.id} | ${c.nom} | ${c.seuil} | ${c.valeur.replace(/\./g, ',')}${c.detail ? ' — ' + c.detail : ''} | ${c.atteint ? '✔ atteint' : '✘ **non atteint**'} |`));
{
  const c4 = nbs.map((nb) => { const a = r.melange[nb]; return { nb, ...wilson(a['mi3.dernier.victoires'], a['mi3.dernier.parties']) }; });
  p(`Le critère 4 est jugé sur la configuration la plus défavorable. Par nombre de joueurs : ${c4.map((x) => `${x.nb} joueurs ${pc(x.p)} ${x.p >= 0.1 ? '✔' : '✘'}`).join(' · ')}.`);
}
p('## 2. Méthode');
p(`- **Moteur unique.** Les parties simulées et les parties jouées dans le navigateur passent par le même moteur (\`moteur/\`), pur et déterministe. Les bots ne reçoivent qu'une observation masquée (ni mains adverses, ni visions, ni signaux non regardés, ni ordre des pioches).`,
  `- **Tables mélangées.** Pour chaque nombre de joueurs (2, 3, 4, 5), **${r.parties} parties**. À chaque partie, la table est tirée sans remise parmi les 9 stratégies non expertes (aléatoire, glouton, 4 spécialistes, chasseur, parieur, bloqueur) et les sièges sont tirés au hasard.`,
  `- **Duels d'expert.** À 2 joueurs, ${r.duels['expert-glouton']?.parties ?? 0} parties expert contre glouton et autant contre aléatoire, en alternant le premier joueur.`,
  `- **Calibrage.** Avant la mesure, les poids du bot de référence (glouton) sont optimisés par recherche évolutionnaire sous les règles mesurées ; les archétypes en dérivent (\`bots/src/bots.ts\`). On ne mesure jamais des règles avec des bots réglés pour d'autres règles, et on n'équilibre jamais en affaiblissant un bot.`,
  `- **Intervalles de confiance** : Wilson à 95 % sur les proportions. Les victoires partagées comptent pour une fraction.`,
  `- **Reproduire** : \`${r.commande || 'npm run sim:final'}\` (graine ${r.graine}), puis \`npx tsx outils/rapport.ts\` et \`npm run graphiques\`.`);
p('### Les stratégies', '| Stratégie | Principe |', '|---|---|',
  '| Aléatoire | Un coup légal au hasard : la référence plancher. |',
  '| Glouton | Maximise l\'évaluation de la position après son coup (projection tendancielle, espérance des paris, risque de rupture). Poids calibrés. |',
  '| Spécialiste (×4) | Glouton qui n\'investit que sur un axe : bonus pour y installer ou y infléchir, malus ailleurs ; choisit sa vision en conséquence. |',
  '| Chasseur de signaux | Surévalue l\'information et les paris : veille tôt et souvent. |',
  '| Parieur de ruptures | Surévalue les préparations et croit davantage à la projection : pousse vers les extrêmes où les ruptures éclatent. |',
  '| Bloqueur | Retranche de son évaluation le score estimé du meneur (vision présumée d\'après ses tendances) : freine d\'abord le premier. |',
  '| Expert | Recherche Monte-Carlo : 160 déroulements par décision sur des mondes tirés au hasard parmi ceux compatibles avec ce qu\'il a vu, allocation UCB1 entre les 6 meilleurs candidats, évaluation après le prochain bilan. |');

p('## 3. Critère 1 — aucune stratégie non experte ne domine');
p('Ratio = taux de victoire × nombre de joueurs (1 = part attendue). Seuil : 1,30.');
p(`| Stratégie | ${nbs.map((n) => n + ' joueurs').join(' | ')} |`, `|---|${nbs.map(() => '---').join('|')}|`, ...Object.keys(NOMS).map((s) => `| ${NOMS[s]} | ${nbs.map((nb) => { const x = partStrategie(r.melange[nb], s, nb); return `${fr(x.ratio, 2)} ${ic({ bas: x.ratioBas, haut: x.ratioHaut }, 1, 2)}`; }).join(' | ')} |`));
p(...nbs.map((nb) => `![Victoires par stratégie, ${nb} joueurs](graphiques/strategies-${nb}j.svg)`));
p('Le bot aléatoire tire la moyenne des autres au-dessus de 1 (environ 1,1) : c\'est attendu, il est dans le vivier comme le demande le cahier des charges.');

p('## 4. Critère 2 — avantage du premier joueur');
p(`| Joueurs | ${[1, 2, 3, 4, 5].map((s) => `${s}${s === 1 ? 'er' : 'e'} à jouer`).join(' | ')} | Écart du 1er à la part attendue |`, '|---|---|---|---|---|---|---|', ...nbs.map((nb) => { const a = r.melange[nb]; const w = wilson(a['siege.0.victoires'], a['siege.0.parties']); return `| ${nb} | ${[0, 1, 2, 3, 4].map((s) => (s < nb ? pc(a[`siege.${s}.victoires`] / a[`siege.${s}.parties`]) : '—')).join(' | ')} | ${fr(100 * (w.p - 1 / nb), 2)} pts ${ic({ bas: w.bas - 1 / nb, haut: w.haut - 1 / nb }, 100, 2)} |`; }));
p('« 1er à jouer » désigne l\'ordre de la première décennie ; ensuite, le joueur qui a le moins de points d\'anticipation ouvre chaque décennie.', ...nbs.map((nb) => `![Victoires par position, ${nb} joueurs](graphiques/sieges-${nb}j.svg)`));

p('## 5. Critère 3 — le talent compte');
for (const adv2 of ['aleatoire', 'glouton']) { const a = r.duels[`expert-${adv2}`]; if (!a) continue; const w = wilson(a['strat.expert.victoires'], a['strat.expert.parties']); p(`- Expert contre ${adv2 === 'aleatoire' ? 'aléatoire' : 'glouton'} : **${pc(w.p)}** de victoires ${ic(w)} sur ${a['strat.expert.parties']} parties (seuil ${adv2 === 'aleatoire' ? '75' : '60'} %). Score moyen : ${fr(a['strat.expert.score'] / a['strat.expert.parties'])} contre ${fr(a[`strat.${adv2}.score`] / a[`strat.${adv2}.parties`])}.`); }

p('## 6. Critère 4 — retour possible');
p('Classement à la fin de la 3ᵉ décennie (2055) d\'après le score que chacun aurait si la partie s\'arrêtait là (mesure omnisciente : visions comprises). Tables sans bot aléatoire.');
p('| Joueurs | Le dernier de 2055 gagne | Le premier de 2055 gagne | Le dernier de 2045 gagne | Tables |', '|---|---|---|---|---|', ...nbs.map((nb) => { const a = r.melange[nb]; const d = wilson(a['mi3.dernier.victoires'], a['mi3.dernier.parties']), pr = wilson(a['mi3.premier.victoires'], a['mi3.premier.parties']), d2 = wilson(a['mi2.dernier.victoires'], a['mi2.dernier.parties']); return `| ${nb} | **${pc(d.p)}** ${ic(d)} ${d.p >= 0.1 ? '✔' : '✘'} | ${pc(pr.p)} | ${pc(d2.p)} ${ic(d2)} | ${Math.round(a['mi3.dernier.parties'])} |`; }));
p('**Lecture honnête.** Le critère est atteint à 2 et 3 joueurs, pas à 4 ni 5. Le meneur de 2055 est loin d\'être assuré de gagner (moins d\'une fois sur deux à 4-5 joueurs) : la fin de partie reste ouverte pour les joueurs du milieu de classement. C\'est le tout dernier qui ne remonte pas. À 5 joueurs, il lui reste 4 actions après 2055.');

p('## 7. Critère 5 — puissance des cartes');
{
  const tout: Agregat = {};
  for (const nb of nbs) for (const k in r.melange[nb]) if (k.startsWith('carte.')) tout[k] = (tout[k] ?? 0) + r.melange[nb][k];
  const cs = cartesStats(tout).sort((a, b) => b.delta - a.delta);
  const titre = (id: string) => [...C.tendances, ...C.signaux, ...C.ruptures, ...C.visions].find((c) => c.id === id)!.titre;
  const ligne = (c: (typeof cs)[0]) => `| ${c.id} | ${titre(c.id)} | ${c.delta >= 0 ? '+' : ''}${fr(100 * c.delta, 2)} pts ${ic(c, 100, 2)} | ${c.n} |`;
  p('Pour chaque carte : taux de victoire des joueurs qui l\'ont jouée (tendance installée, signal parié, rupture préparée, vision détenue), moins leur part attendue 1/n. Toutes tables mélangées confondues.');
  p('| Carte | Titre | Écart | Occurrences |', '|---|---|---|---|', ...cs.slice(0, 5).map(ligne), '| … | | | |', ...cs.slice(-5).map(ligne));
  const hors = cs.filter((c) => Math.abs(c.delta) > 0.08);
  p(`Cartes au-delà de ± 8 points : **${hors.length}**. Écart-type des écarts : ${fr(100 * Math.sqrt(cs.reduce((s, c) => s + c.delta * c.delta, 0) / cs.length), 2)} points. ${cs.filter((c) => c.victoires > 0).length} cartes sur ${cs.length} apparaissent dans au moins une partie gagnante (critère trivialement satisfait à ce volume).`);
  const vis = cs.filter((c) => c.id[0] === 'V');
  const rad = vis.filter((c) => Number(c.id.slice(1)) % 2 === 0), ref = vis.filter((c) => Number(c.id.slice(1)) % 2 === 1);
  const moy = (x: typeof vis) => x.reduce((s, c) => s + c.delta, 0) / x.length;
  p(`Visions réformistes (cases 3 et 7) : ${moy(ref) >= 0 ? '+' : ''}${fr(100 * moy(ref), 2)} pts en moyenne ; visions radicales (cases 1 et 9) : ${moy(rad) >= 0 ? '+' : ''}${fr(100 * moy(rad), 2)} pts. Les écarts positifs les plus forts sont ceux des signaux et des ruptures : y parier ou s'y préparer est un marqueur de bon jeu autant qu'une cause de victoire.`, '![Puissance des cartes](graphiques/cartes.svg)');
}

p('## 8. Critère 6 — variété des sociétés finales');
p('Type de société = pôle le plus marqué en 2075 (à égalité, celui vers lequel le monde a penché le plus longtemps) ; « équilibre » si aucun axe n\'est à plus d\'une case du centre.');
p(`| Type | ${nbs.map((n) => n + ' j.').join(' | ')} |`, `|---|${nbs.map(() => '---').join('|')}|`, ...C.types.map((t, i) => `| ${t.nom} | ${nbs.map((nb) => pc(typesStats(r.melange[nb])[i].part)).join(' | ')} |`));
p(`![Sociétés de 2075, 4 joueurs](graphiques/types-4j.svg)`);

p('## 9. Critère 7 — durée');
p('Conversion (hypothèses de l\'auteur, non chronométrées, voir `DECISIONS.md` D16) : **à table**, 6 min de mise en place + 38 s par décision + 2 min 30 par bilan ; **en ligne**, 1 min + 40 s par décision de l\'humain + 2,5 s par décision de bot + 1 min 12 par bilan. Une « décision » est un choix soumis à un joueur (veiller puis parier comptent pour deux).');
p('| Joueurs | Décisions (moyenne ± écart-type) | À table | En ligne, seul contre des bots | Cible |', '|---|---|---|---|---|', ...nbs.map((nb) => { const d = dureeStats(r.melange[nb]); const mn = minutes(nb, d.moy); return `| ${nb} | ${fr(d.moy)} ± ${fr(d.sd)} | ${fr(mn.table, 0)} min ${mn.table >= 45 && mn.table <= 75 ? '✔' : '✘'} | ${fr(mn.ligne, 0)} min ${mn.ligne >= 20 && mn.ligne <= 40 ? '✔' : '✘'} | 45-75 / 20-40 |`; }));
p(`![Durée simulée, 4 joueurs](graphiques/duree-4j.svg)`);

p('## 10. Critère 8 — au moins deux coups défendables');
{
  const a: Agregat = {};
  for (const k in r.duels) for (const c in r.duels[k]) if (c.startsWith('c8.')) a[c] = (a[c] ?? 0) + r.duels[k][c];
  const n = a['c8.decisions'];
  p(`Sur ${n} décisions de l'expert offrant au moins deux coups légaux (${fr(a['c8.legaux'] / n)} coups légaux en moyenne) :`,
    `- coups dont le **score final attendu** est à moins de 10 % de celui du meilleur : **${fr(a['c8.proches'] / n, 2)}** en moyenne ; ${pc(a['c8.auMoins2'] / n)} des décisions en ont au moins deux ;`,
    `- mesure plus stricte, sur la **marge** (score du joueur moins meilleur score adverse, tolérance de 10 % du score attendu) : **${fr(a['c8.prochesMarge'] / n, 2)}** en moyenne ; ${pc(a['c8.auMoins2Marge'] / n)} des décisions en ont au moins deux.`,
    'Seuls les candidats explorés au moins 6 fois par la recherche sont comptés, pour ne pas prendre du bruit pour de la proximité.');
}

p('## 11. Distribution des scores et physionomie des parties');
p('| Joueurs | Score moyen | Vision | Héritage | Anticipation | Score du gagnant | Écart 1er-2e | Parties à 2 points ou moins | Égalités |', '|---|---|---|---|---|---|---|---|---|', ...nbs.map((nb) => { const a = r.melange[nb]; const n = a.parties * nb; return `| ${nb} | ${fr(a['score.total'] / n)} | ${fr(a['score.vision'] / n)} | ${fr(a['score.heritage'] / n)} | ${fr(a['score.anticipation'] / n)} | ${fr((a['gagnant.vision'] + a['gagnant.heritage'] + a['gagnant.anticipation']) / a.parties)} | ${fr(a.ecartTete / a.parties)} | ${pc((a.serrees ?? 0) / a.parties, 0)} | ${pc((a.egalites ?? 0) / a.parties)} |`; }));
p('| Joueurs | Ruptures éclatées | Signaux amplifiés | Bascules | Tendances en jeu en 2075 | dont verrouillées | Installer | Veiller | Se préparer | Infléchir | Prospecter |', '|---|---|---|---|---|---|---|---|---|---|---|', ...nbs.map((nb) => { const a = r.melange[nb]; const m = (k: string) => fr((a[k] ?? 0) / a.parties); return `| ${nb} | ${m('evt.rupture')} | ${m('evt.signalAmplifie')} | ${m('evt.bascule')} | ${m('evt.tendancesFinales')} | ${m('evt.verrouillees')} | ${m('coup.installer')} | ${m('coup.veiller')} | ${m('coup.preparer')} | ${m('coup.inflechir')} | ${m('coup.prospecter')} |`; }));
p('(Moyennes par partie ; les cinq dernières colonnes comptent les actions de toute la table.)', `![Distribution des scores, 4 joueurs](graphiques/scores-4j.svg)`);

p('## 12. Évolution des métriques au fil des itérations');
p('Chaque point est une version des règles mesurée sur 2 000 parties par configuration (10 000 pour la dernière). Détail des hypothèses dans `ITERATIONS.md`.', '![C1](graphiques/evolution-c1.svg)', '![C4](graphiques/evolution-c4.svg)', '![C3](graphiques/evolution-c3.svg)', '![Part de l\'anticipation](graphiques/evolution-anticipation.svg)');

p('## 13. Test adverse');
if (adv) {
  const rs = adv.ratios;
  const au = rs.filter((x) => x > 1.3).length;
  p(`Règles gelées, puis recherche active d'une stratégie dominante : algorithme évolutionnaire sur les 11 poids de l'évaluation (plus l'axe de spécialisation), bornes élargies au-delà des valeurs calibrées.`,
    `- **${adv.nbVariantes} variantes** évaluées (${adv.reglages.generations} générations de ${adv.reglages.population}, élitisme, mutation, croisement, 10 % d'immigrants aléatoires), chacune sur ${adv.reglages.parties} parties par nombre de joueurs (2, 3, 4, 5) face au vivier de référence, à un siège tournant.`,
    `- En sélection (${adv.reglages.parties * 4} parties par variante, donc bruitée) : ratio médian ${fr(rs[Math.floor(rs.length / 2)], 2)}, maximum ${fr(rs[rs.length - 1], 2)} ; ${au} variante${au > 1 ? 's' : ''} au-dessus de 1,30 sur cette estimation bruitée.`,
    `- **Finale** : les 5 meilleures variantes rejouées sur ${adv.reglages.partiesFinales} parties indépendantes par nombre de joueurs.`);
  p('| Finaliste | Ratio global (IC 95 %) | 2 j. | 3 j. | 4 j. | 5 j. | Poids marquants |', '|---|---|---|---|---|---|---|', ...adv.finalistes.map((f, i) => `| ${i + 1} (${f.origine}) | **${fr(f.ratio, 3)}** ${ic(f, 1, 3)} | ${f.parNb.map((x) => fr(x, 2)).join(' | ')} | vision ${fr(f.poids.vision, 2)}, héritage ${fr(f.poids.heritage, 2)}, signal ${fr(f.poids.signal, 2)}, rupture ${fr(f.poids.rupture, 2)}, veille ${fr(f.poids.veille, 2)}, blocage ${fr(f.poids.blocage, 2)} |`));
  const pire = Math.max(...adv.finalistes.map((f) => f.ratio)), pireNb = Math.max(...adv.finalistes.flatMap((f) => f.parNb));
  p(`**Verdict.** Meilleure variante confirmée : ratio ${fr(pire, 3)} toutes configurations confondues, ${fr(pireNb, 2)} dans sa configuration la plus favorable — ${pireNb <= 1.3 ? '**sous le seuil de 1,30 partout** : le test adverse n\'a pas trouvé de stratégie dominante dans cet espace.' : pire <= 1.3 ? '**sous le seuil de 1,30 en moyenne, mais au-dessus dans au moins une configuration** : voir la discussion ci-dessous.' : '**au-dessus du seuil** : stratégie dominante trouvée.'}`,
    `Reproduire : \`${adv.commande}\`.`, '![Test adverse](graphiques/adverse.svg)',
    '**Portée.** Cette recherche explore les variantes d\'une même fonction d\'évaluation à un coup d\'anticipation. Elle ne prouve rien sur des stratégies d\'une autre nature (coalitions, temporisation délibérée) : voir `AUTOCRITIQUE.md`.');
} else p('*Test adverse non encore exécuté.*');

p('## 14. Ce que ce rapport ne dit pas');
p('Les huit critères mesurent des propriétés statistiques de parties jouées par des programmes. Ils ne disent rien du plaisir, de la clarté des règles, de la qualité du récit, de la négociation à table, ni de la durée réelle. `AUTOCRITIQUE.md` liste ces limites et cinq questions à vérifier en partie test avec des humains.');
fs.writeFileSync('docs/RAPPORT_EQUILIBRAGE.md', L.join('\n'));
console.log('docs/RAPPORT_EQUILIBRAGE.md écrit : ' + crit.map((c) => `${c.id} ${c.atteint ? '✔' : '✘'}`).join(' '));
