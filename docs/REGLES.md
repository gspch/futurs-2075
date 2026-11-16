<div class="entete"><div>

# Aiguillages

**Un jeu sur les futurs possibles, 2025 → 2075** · 2 à 5 joueurs · 14 ans et plus · 45 à 75 minutes · règles v{{param:version}}

</div></div>

Nous sommes en 2025. Cinq décennies plus tard, le monde aura changé, et pas forcément comme vous l'espériez. Chaque joueur porte en secret une **vision** : son futur souhaitable. Mais il n'y a qu'**un seul monde**, que tous poussent en même temps. Installez des **tendances** qui pèseront jusqu'en 2075, repérez les **signaux faibles** avant les autres, préparez-vous aux **ruptures**. Et visez juste : un aiguillage franchi ne se refranchit pas, et le monde ne s'arrête pas là où vous le vouliez.

## 1. Matériel

- **1 plateau du monde** : 4 pistes de 11 cases (0 à 10), 4 pions d'axe, 1 marqueur de décennie.
- **56 cartes Tendance** (7 par pôle), **28 cartes Signal faible**, **16 cartes Rupture**, **16 cartes Vision**.
- Par joueur : **{{param:jetonsAttention}} jetons d'attention**, des marqueurs de propriété, 1 marqueur de score.
- 1 dé à {{param:facesDe}} faces, 8 marqueurs « voie fermée », 1 piste de points d'anticipation.

**Les quatre axes.** Chaque axe relie deux pôles. Aucun pôle n'est « le bon » : ce sont des choix de société.

| Axe | Pôle bas ◀ (case 0) | Pôle haut ▶ (case 10) |
|---|---|---|
| **Matière** | Sobriété : vivre de peu | Abondance : vivre de beaucoup |
| **Technique** | Outil : des techniques simples, en main | Automate : des machines qui agissent seules |
| **Échelle** | Local : la vie s'organise près de chez soi | Global : elle s'organise à l'échelle du monde |
| **Lien** | Autonomie : chacun compose sa vie | Commun : on possède et décide ensemble |

Un axe **penche** vers un pôle quand son pion est de ce côté du centre (case 5). Au centre, il ne penche d'aucun côté.

## 2. Mise en place

{{schema:miseEnPlace}}

1. Placez les 4 pions d'axe en **case 5**. Mélangez séparément les quatre paquets.
2. Chaque joueur prend {{param:jetonsAttention}} jetons d'attention, reçoit **{{param:tailleMain}} cartes Tendance** (sa main, secrète) et **2 cartes Vision** : après avoir regardé sa main, il en garde **une**, face cachée, et remet l'autre sous le paquet.
3. **Horizon** : posez face cachée {{param:signauxParDecennie}} signaux **proches** et {{param:signauxParDecennie}} signaux **lointains**. Révélez **1 rupture** : elle est *latente*.
4. Désignez un premier joueur au hasard. Le rôle passe au voisin de gauche à chaque nouvelle décennie.

## 3. But du jeu

La partie dure **5 décennies** (2025-2035, … , 2065-2075). En 2075, on additionne trois sources de points :

- **Vision** (le souhaitable) : plus chaque axe visé est proche de la **case** indiquée sur votre carte, plus vous marquez (§ 8).
- **Héritage** (le probable) : {{param:ptsHeritage}} point par tendance que vous avez installée, encore en jeu, et **du côté où son axe a fini**.
- **Anticipation** : les points gagnés en cours de partie grâce aux signaux et aux ruptures (publics, sur la piste).

Le plus haut total gagne. Égalité : le plus de points d'anticipation l'emporte, sinon la victoire est partagée.

## 4. Une décennie

Chaque décennie se joue en trois temps.

**A. Début de décennie** (sauf la première, déjà en place) : révélez 1 rupture (s'il y en a déjà 2 latentes, n'en révélez pas) ; posez {{param:signauxParDecennie}} nouveaux signaux lointains face cachée (pas en dernière décennie : ils n'auraient pas le temps de mûrir) ; chacun complète sa main à {{param:tailleMain}} cartes.

**B. Actions.** En commençant par le premier joueur, chacun fait **une action**, et l'on fait ainsi plusieurs tours de table : **{{param:actionsParDecennie.2}}** tours à 2 joueurs, **{{param:actionsParDecennie.3}}** à 3 ou 4, **{{param:actionsParDecennie.5}}** à 5.

**C. Bilan de décennie** (§ 6), puis on avance le marqueur de décennie.

## 5. Les actions

À votre tour, choisissez **une** action.

### Installer une tendance
Posez une carte Tendance de votre main du côté de son pôle, **couchée** (elle est *émergente*), avec un de vos marqueurs dessus. Elle ne déplace rien tout de suite : elle pèsera à **chaque** bilan.
Les tendances de force 2 ont un **prérequis** : un autre axe doit déjà pencher du côté indiqué. On ne peut pas installer une tendance vers une **voie fermée** (§ 6).

### Veiller un signal faible
Posez un jeton d'attention sur un signal de l'Horizon où vous n'avez pas déjà parié, et **regardez-le en secret**. Puis, au choix :
- **pariez** : orientez votre jeton sur la lecture ▲ (haute) ou ▼ (basse) du signal. **Une seule place par lecture** : si un autre joueur occupe déjà ▲, il ne vous reste que ▼. Un pari posé sur un signal *lointain* est **précoce** (retournez le jeton côté « + ») ;
- ou **retirez** votre jeton : mettez-le de côté, il vous reviendra au bilan.

### Se préparer à une rupture
Posez un jeton d'attention sur une rupture latente (un seul par joueur et par rupture). Si elle éclate, vous marquez **{{param:ptsRupture}} points**. Le jeton vous revient quand la rupture éclate ou se dissipe.

### Infléchir une tendance
Défaussez une tendance **d'un autre joueur ou née d'un signal**, tant qu'elle n'est pas verrouillée. Coût en jetons d'attention, mis de côté jusqu'au bilan : **{{param:coutInflechir}}** selon qu'elle est émergente ou installée.

### Prospecter
Piochez {{param:piocheProspecter}} cartes Tendance (impossible si cela vous ferait dépasser {{param:mainMax}} cartes). Si la pioche est vide, mélangez la défausse.

> **L'attention est rare.** Vous n'avez que {{param:jetonsAttention}} jetons pour tout : regarder, parier, vous préparer, infléchir. Un jeton posé sur un signal lointain est immobilisé deux bilans. Si vous ne pouvez faire aucune action, passez.

## 6. Le bilan de décennie

Effectuez ces cinq étapes **dans l'ordre**.

**1. Mouvement.** Pour chaque axe, additionnez les forces des tendances de chaque côté. Le pion avance d'**une case** vers le côté le plus lourd (égalité : il ne bouge pas). Peu importe l'écart : le monde change lentement.

**2. Signaux proches.** Retournez chaque signal proche. Sa carte indique un axe de **contexte** :
- si le contexte penche vers son pôle haut, c'est la lecture **▲** qui se réalise ; vers son pôle bas, la lecture **▼** ;
- si la lecture réalisée décrit une tendance, le signal **s'amplifie** : laissez la carte en jeu du côté indiqué, redressée, sans propriétaire. C'est désormais une tendance *installée* de force {{param:forceSignal}} ;
- sinon (contexte au centre, lecture absente, carte « Bruit », voie fermée), le signal **s'éteint** : défaussez-le.
- Le joueur qui avait parié sur la lecture réalisée d'un signal **amplifié** marque **{{param:ptsSignalPrecoce}} points** si son pari était précoce, **{{param:ptsSignalTardif}}** sinon. Tous les jetons reviennent à leurs propriétaires.

**3. Ruptures latentes.** Pour chacune, calculez sa **tension** : le nombre de cases dont son axe de *terrain* dépasse le centre du côté indiqué (certaines cartes fixent un minimum de 1). Lancez le dé : si le résultat est **inférieur ou égal** à la tension, la rupture **éclate** — chaque joueur préparé marque {{param:ptsRupture}} points, appliquez les effets de la carte dans l'ordre, puis défaussez-la. Sinon elle reste latente ; à son **deuxième** bilan sans éclater, elle se **dissipe** (défaussez-la, les jetons reviennent).

**4. Bascules.** Un axe dont le pion est à **{{param:seuilBascule}} cases ou plus du centre** (cases à bord épais et au-delà) a franchi un point de non-retour : la voie du pôle **opposé** est **fermée pour le reste de la partie** (posez un marqueur). Plus personne ne peut installer de tendance vers ce pôle ; défaussez-les de vos mains et écartez-les quand vous les piochez. Les tendances déjà en jeu restent. La voie reste fermée même si le pion recule ensuite.

**5. Ancrage.** Les tendances émergentes (couchées) deviennent **installées** (redressées) ; celles qui étaient déjà installées deviennent **verrouillées** (jeton ■) : plus personne ne peut les infléchir. Les signaux lointains deviennent proches. Chacun récupère les jetons mis de côté.

{{schema:cycles}}

## 7. Fin de partie

Après le bilan de la 5ᵉ décennie, révélez les visions et comptez (§ 3). Prenez une minute pour regarder le monde obtenu : quel pôle domine chaque axe, quelles voies se sont fermées, et à qui ce futur convient.

## 8. Les cartes

**Tendance.** Axe, pôle et force (1 ou 2). « Pousse Matière vers Sobriété (force 1) ». Les forces 2 portent un prérequis.

**Signal faible.** Un axe de contexte et deux lectures. Exemple — *Semaines de quatre jours*, contexte Technique : ▲ si Technique penche vers Automate, naît « Temps libéré pour le collectif » (Lien ▶ Commun) ; ▼ si Technique penche vers Outil, naît « Pluriactivité individuelle » (Lien ◀ Autonomie). Certains signaux n'ont qu'une lecture ; quatre ne sont que du **bruit**.

**Rupture.** Un terrain (axe et pôle), parfois une tension minimale, et des effets : *l'axe recule de n cases* vers le pôle indiqué ; *défaussez les n plus anciennes tendances* d'un pôle (même verrouillées — à ancienneté égale, la première posée) ; *chacun défausse sa main et repioche* autant de cartes. Un recul peut faire franchir une bascule : on le vérifie à l'étape 4.

**Vision.** Un objectif **principal ★** et un objectif **secondaire ☆**, chacun sous la forme « axe en case n ». On compte l'écart entre le pion et la case visée, **dans un sens ou dans l'autre** :

| Écart à la case visée | 0 | 1 | 2 | 3 | 4 et plus |
|---|---|---|---|---|---|
| ★ Principal | 10 | 7 | 4 | 1 | 0 |
| ☆ Secondaire | 5 | 3 | 1 | 0 | 0 |

Les visions *réformistes* visent près du centre (cases 3 ou 7), les *radicales* loin (cases 1 ou 9).

## 9. Exemples

> **Un bilan.** Sur Matière : Sobriété totalise 3 (trois tendances de force 1), Abondance 2 (une force 2). Le pion passe de 5 à 4. Le signal proche *Jardins partagés* a pour contexte Matière, qui penche maintenant vers Sobriété : sa lecture ▼ se réalise, la tendance « Autoproduction alimentaire de quartier » entre en jeu côté Local. Léa avait posé son jeton sur ▼ quand le signal était encore lointain : pari précoce, {{param:ptsSignalPrecoce}} points.

> **Une rupture.** *Panne systémique des réseaux* a pour terrain Technique ▶ Automate. Le pion Technique est en case 8 : tension 3. On lance le dé : 2, la rupture éclate. Technique recule de 3 cases (8 → 5) et les deux plus anciennes tendances Automate sont défaussées, bien que verrouillées. Karim, qui s'y était préparé, marque {{param:ptsRupture}} points.

> **Viser juste.** La vision d'Inès vise ★ Lien en case 7. En 2055 le pion est en 7, mais Commun pèse 5 contre 2 : sans frein, il sera en 9 en 2075 et Inès ne marquera que 4 points au lieu de 10. Elle doit infléchir une tendance Commun encore jeune ou installer elle-même de l'Autonomie — pendant que Hugo, qui vise la case 9, pousse dans l'autre sens.

## 10. Précisions

- **Ordre des effets.** Le bilan suit toujours l'ordre 1 à 5. Un signal est donc lu *après* le mouvement de la décennie, une bascule vérifiée *après* les ruptures.
- **Information.** Sont secrets : votre main, votre vision, les signaux que vous avez regardés. Sont publics : tout le reste, y compris qui a parié sur quelle lecture et combien de cartes chacun a en main. Vous pouvez dire ce que vous voulez, vrai ou faux, mais pas montrer une carte.
- **Signal déjà parié des deux côtés.** On peut encore le veiller pour le regarder, mais il faudra retirer son jeton.
- **Tendance née d'un signal.** Elle n'a pas de propriétaire et ne rapporte d'héritage à personne. Elle arrive installée : elle sera verrouillée au bilan suivant.
- **Pioche Tendance épuisée et défausse vide.** On ne pioche pas.
- **À 2 joueurs**, aucune règle ne change : le jeu devient un duel d'influence, plus tactique.

## 11. Variantes

- **Découverte (première partie).** Jouez sans les tendances de force 2 et retirez les quatre signaux « Bruit ».
- **Débat.** Avant chaque bilan, chaque joueur dispose de trente secondes pour dire tout haut où il pense que le monde va, sans montrer ses cartes.

<p style="font-size:8pt;color:#444;margin-top:4mm">Aiguillages est un jeu libre : règles et cartes sous licence CC BY-SA 4.0, code sous licence MIT. Les cartes évoquent des débats réels de prospective, sans prédire ni recommander aucun futur. Dépôt, jeu en ligne et rapport d'équilibrage : github.com/gspch/futurs-2075</p>
