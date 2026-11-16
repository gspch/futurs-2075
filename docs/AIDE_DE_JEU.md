# Aiguillages — aide de jeu

**But.** En 2075 : **Vision** (écart de chaque axe visé à sa case : ★ 10 / 7 / 4 / 1, ☆ 5 / 3 / 1) + **Héritage** ({{param:ptsHeritage}} pt par tendance à vous, en jeu, du côté où son axe a fini) + **Anticipation** (points gagnés en cours de partie).

## Une décennie

**A. Début** (dès la 2ᵉ décennie) : révéler 1 rupture (2 latentes au plus) · poser {{param:signauxParDecennie}} signaux lointains (pas en 5ᵉ décennie) · compléter sa main à {{param:tailleMain}} · le premier joueur passe à gauche.

**B. Actions** : une action chacun, {{param:actionsParDecennie.2}} tours de table à 2 joueurs, {{param:actionsParDecennie.3}} à 3-4, {{param:actionsParDecennie.5}} à 5.

**C. Bilan**, dans l'ordre : mouvement → signaux proches → ruptures → bascules → ancrage.

## À votre tour : une action

| Action | Ce que vous faites | Coût |
|---|---|---|
| **Installer** | Poser une tendance de votre main, couchée (émergente), avec votre marqueur. Force 2 : prérequis à respecter. Jamais vers une voie fermée. | 1 carte |
| **Veiller** | Poser un jeton sur un signal, le regarder en secret, puis l'orienter ▲ ou ▼ (pari ; une place par lecture) **ou** le retirer. | 1 jeton (jusqu'à la résolution du signal, ou jusqu'au bilan s'il est retiré) |
| **Se préparer** | Poser un jeton sur une rupture latente. {{param:ptsRupture}} points si elle éclate. | 1 jeton (jusqu'à l'éclatement ou la dissipation) |
| **Infléchir** | Défausser une tendance non verrouillée d'un autre joueur. | {{param:coutInflechir}} jeton(s) : émergente / installée (rendus au bilan) |
| **Prospecter** | Piocher {{param:piocheProspecter}} tendances (main de {{param:mainMax}} cartes au plus). | — |

## Le bilan, étape par étape

1. **Mouvement.** Chaque pion avance d'**une** case vers le côté dont les tendances pèsent le plus lourd. Égalité : immobile.
2. **Signaux proches.** Contexte penché vers le haut : lecture ▲ ; vers le bas : lecture ▼. Lecture avec tendance → le signal **s'amplifie** (tendance verrouillée, force {{param:forceSignal}}, sans propriétaire). Sinon il **s'éteint**. Pari juste sur un signal amplifié : **{{param:ptsSignalPrecoce}}** points s'il était précoce, **{{param:ptsSignalTardif}}** sinon.
3. **Ruptures.** Tension = cases au-delà du centre vers le terrain. Dé ≤ tension : elle **éclate** ({{param:ptsRupture}} points par joueur préparé, puis effets). Deuxième bilan sans éclater : elle se dissipe.
4. **Bascules.** Pion à {{param:seuilBascule}} cases ou plus du centre : la voie opposée est **fermée pour toujours**.
5. **Ancrage.** Émergente (couchée) → installée (redressée) → verrouillée (■). Signaux lointains → proches. Les jetons mis de côté reviennent.

## Repères

| | Émergente | Installée | Verrouillée |
|---|---|---|---|
| **Tendance** | couchée · infléchir : {{param:coutInflechir}} jeton(s) selon l'état | redressée | jeton ■ · intouchable, sauf rupture |

- **Pencher** : un axe penche vers un pôle quand son pion est de ce côté de la case 5.
- **Futur probable** d'un axe : sa case actuelle, plus une case par décennie restante vers le côté le plus lourd.
- **Viser juste** : dépasser sa case coûte autant que ne pas l'atteindre. Freiner, c'est infléchir ou installer en face.
- **Tension** : plus le monde va loin vers un pôle, plus les ruptures de ce terrain sont probables (tension 3 = une chance sur deux).
- **Secret** : main, vision, signaux regardés. **Public** : tout le reste.
