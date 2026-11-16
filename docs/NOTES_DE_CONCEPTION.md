# Notes de conception

## Intention

Faire sentir la prospective par la mécanique, pas par le texte. Après trois parties, un joueur doit avoir éprouvé — sans qu'on le lui explique — ce qu'est un signal faible,
une rupture, une dépendance au chemin, une irréversibilité, et la différence entre un futur probable et un futur souhaitable.

Le parti pris central : **il n'y a qu'un monde**. Les joueurs ne construisent pas chacun leur société dans leur coin ; ils se disputent la trajectoire d'une société commune,
de 2025 à 2075. Chacun sait ce qu'il souhaite (sa vision, secrète) ; tous voient où le monde va (la projection, publique). Le jeu se joue dans l'écart entre les deux.

Curseur d'interaction : **compétitif à alliances de circonstance**. Un seul gagnant, mais des visions qui se recoupent : deux joueurs qui veulent « plus de Commun » poussent ensemble…
jusqu'au moment où celui qui visait la case 7 doit freiner celui qui vise la case 9. Un coopératif pur aurait supposé un « bon futur » à atteindre ensemble, ce que la neutralité du propos interdit ;
un compétitif pur sur des tableaux séparés aurait vidé de son sens l'idée de futur commun.

## Comment chaque mécanique incarne un concept

| Concept de prospective | Mécanique | Ce que le joueur éprouve |
|---|---|---|
| **Tendance lourde** | Une tendance installée pousse son axe à *chaque* bilan jusqu'à la fin. L'axe n'avance que d'une case par décennie, vers le côté le plus lourd. | Rien ne bouge quand je joue la carte ; tout a bougé vingt ans plus tard. Une tendance posée en 2030 pèse cinq fois, une tendance posée en 2070 une seule. |
| **Inertie, difficulté d'inverser** | Ancrage : émergente (1 jeton pour l'infléchir) → installée (2 jetons) → verrouillée (intouchable). | Il fallait s'y opposer tout de suite. Dix ans plus tard c'est cher, vingt ans plus tard c'est trop tard. |
| **Futur probable (tendanciel)** | La projection : case actuelle + une case par décennie restante vers le côté le plus lourd. Affichée en permanence dans le jeu web, calculable d'un coup d'œil à table. | « Si rien ne change, on finit là. » Le probable est une information publique, pas une opinion. |
| **Futur souhaitable** | La vision secrète vise des *cases précises*, et l'écart compte dans les deux sens. | Le souhaitable n'est pas « toujours plus » : c'est un point d'arrivée, que l'inertie fait facilement dépasser. On découvre qu'il faut parfois freiner ce qu'on a soi-même lancé. |
| **Écart probable / souhaitable** | Deux sources de points qui tirent en sens contraire : la vision (ce que je veux) et l'héritage (2 points par tendance à moi qui se trouve *du côté où le monde a fini*). | Je peux gagner en ayant eu raison contre mon propre désir. Accompagner le probable paie ; s'y opposer coûte de l'héritage. |
| **Signal faible** | Carte face cachée. La regarder coûte de l'attention. Elle a deux lectures ; laquelle se réalise dépend du *contexte* (un autre axe) au moment où le signal mûrit. | Un signal ne dit pas ce qu'il deviendra : son sens dépend du monde dans lequel il grandit. Le voir tôt ne suffit pas, il faut l'interpréter — et parier. |
| **Repérer tôt est un pari** | Pari précoce (signal lointain, résolu dans deux bilans) : 3 points ; pari tardif : 1 point. Une seule place par lecture. | Tôt, c'est mieux payé, plus incertain, et la place est encore libre. Tard, c'est sûr, mal payé, et souvent déjà pris. |
| **Bruit** | Quatre signaux ne s'amplifient jamais ; un tiers des autres n'ont qu'une lecture. | Tout ce qui frémit ne devient pas une tendance. L'attention gaspillée ne revient qu'au bilan. |
| **Impacts croisés** | Le contexte d'un signal et le prérequis d'une tendance lourde portent sur un *autre* axe que celui qu'ils modifient. | Pousser la Technique change ce que deviendront les signaux sur le Lien. Les axes ne sont pas indépendants. |
| **Rupture (wild card)** | Visible de loin, face découverte. Un dé contre la *tension* : le nombre de cases dont le monde s'est avancé vers le terrain de la rupture. | Improbable près du centre, presque certaine aux extrêmes : plus un monde est allé loin dans une direction, plus il s'expose. On peut s'y préparer — au prix d'une attention qui manquera ailleurs. |
| **Dépendance au chemin** | Prérequis des tendances lourdes ; lecture des signaux selon le contexte ; force cumulée des tendances verrouillées. | Les options de 2060 sont celles que 2030 a rendues possibles. |
| **Irréversibilité** | Bascule : un axe à 4 cases du centre ferme *définitivement* la voie opposée, même s'il recule ensuite. | Un aiguillage franchi ne se refranchit pas. Les cartes de la voie fermée sont mortes dans ma main. |
| **Attention limitée** | Trois jetons pour tout : regarder un signal, parier, se préparer à une rupture, infléchir une tendance. | On ne peut pas tout surveiller. Veiller au loin, c'est renoncer à agir sur le présent. |

## Ce que la simulation a changé à la conception

Le premier jet (v0.1) cochait toutes les cases thématiques et ne tenait pas debout : c'était un jeu de paris où l'on gagnait en regardant des cartes.
Trois corrections ont compté plus que les autres (détail chiffré dans `ITERATIONS.md`) :

1. **Rendre l'attention rare et disputée** (v0.2, v0.5). Trois jetons, une place par lecture, un jeton engagé pour regarder. L'idée n'est pas venue de la théorie mais d'un constat : 29 veilles par partie.
2. **Viser juste** (v0.4). Tant que « souhaitable » voulait dire « le plus loin possible », le meneur gagnait par inertie et un bot à un coup d'anticipation battait l'expert.
   Donner aux visions une case cible a fait de l'inertie un problème pour tout le monde — et c'est aussi la mécanique dont le propos est le plus juste.
3. **Payer la construction autant que la prévision** (v0.6). Sans cela, la trajectoire n'était qu'un décor pour les paris.

## Idées écartées

- **Un tableau de société par joueur.** Plus facile à équilibrer, mais chacun aurait eu « son » futur : plus de monde commun, plus d'écart entre probable et souhaitable.
- **Coopératif contre un « effondrement ».** Écarté pour sa morale implicite (il y aurait un bon et un mauvais futur) et pour sa parenté avec les coopératifs à menace croissante.
- **Visions directionnelles** (« le plus de Sobriété possible »). Jouées jusqu'à la v0.3 ; produisaient un jeu plat et un meneur intouchable.
- **Pas de 2 cases par décennie.** Les axes arrivaient en bout de piste en trois bilans ; la fin de partie n'avait plus d'enjeu.
- **Paris ouverts à tous sur un même signal.** Chacun suivait le premier parieur ; l'information ne valait rien.
- **Regarder un signal gratuitement.** Voir v0.5.
- **Ruptures tirées au hasard d'une pioche, sans préavis.** Une loterie. Les ruptures sont visibles deux bilans à l'avance et leur probabilité se lit sur le plateau.
- **Ruptures qui récompensent le pôle dominant.** Elles frappent toutes le pôle le plus avancé : c'est le seul frein automatique du jeu à l'emballement.
- **Barème de vision concave, ruptures plus nombreuses en fin de partie, bonus de cohérence sur l'héritage.** Essayés pour aider le dernier à revenir ; sans effet mesurable (v0.3).
- **Révision de vision en cours de partie, ralliement au futur probable.** Thématiquement séduisants (on révise bien ses désirs), non implémentés : gain estimé trop faible à 5 joueurs pour une règle de plus. Piste ouverte (voir les issues).
- **Révéler les visions à mi-partie.** Aurait créé de la coalition contre le meneur, donc du retour — et du faiseur de roi. Écarté.

## Emprunts assumés

Aucune mécanique n'est sans ancêtre. Voici ce qui est emprunté, et ce qui en est fait.

| Emprunt | D'où vient l'idée | Ce qui est neuf ici |
|---|---|---|
| Objectif secret par joueur | Très répandu dans les jeux modernes | L'objectif est une *case cible* sur un axe partagé, pas une collection : on peut l'avoir atteint en 2055 et perdu en 2075 par simple inertie. |
| Pistes d'influence disputées (« tir à la corde ») | Jeux d'influence à pistes communes | La piste n'est pas déplacée par l'action elle-même mais par des forces qui restent en jeu et s'accumulent ; l'action d'aujourd'hui joue à chaque décennie suivante. |
| Majorité par zone | Jeux de majorité | La majorité ne rapporte rien en soi : elle déplace le monde d'une case, ce qui sert ou dessert chaque vision différemment. |
| Pari sur une information cachée, paiement plus fort si l'on s'engage tôt | Jeux de paris et de cotes | Ce sur quoi l'on parie n'est pas fixé d'avance : la lecture qui se réalise dépend d'un contexte que les parieurs peuvent eux-mêmes déplacer. |
| Placement d'ouvriers à places uniques | Jeux de pose d'ouvriers | Les « ouvriers » sont de l'attention ; les places sont des interprétations concurrentes d'un même signal. |
| Événements visibles à l'avance avec compte à rebours | Jeux à menaces annoncées | La probabilité n'est pas sur la carte : elle se lit sur l'état du monde, et monte avec ce que les joueurs ont eux-mêmes construit. |
| Ordre du tour inversé pour les moins avancés | Mécanisme de rattrapage classique | Appliqué aux seuls points publics (anticipation) : il donne la première place sur les signaux à ceux qui ont le moins parié. |

Le jeu n'est l'habillage d'aucun des titres cités dans le cahier des charges : pas de réseau à construire ni de troc (Catan), pas de coopération contre une propagation (Pandemic),
pas de draft simultané (7 Wonders), pas de moteur de production individuel (Terraforming Mars), pas de construction de paquet (Dominion).

## Contenu et neutralité

- Quatre axes bipolaires dont chaque pôle est défendu par des courants réels du débat prospectif : Matière (Sobriété / Abondance), Technique (Outil / Automate), Échelle (Local / Global), Lien (Autonomie / Commun).
- Huit domaines irriguent les cartes : climat, démographie, technologie, gouvernance, économie, culture, santé, géopolitique.
- Les cartes sont **qualitatives** : aucune ne cite de chiffre. Les rares constats factuels (« vivre seul devient une étape longue et ordinaire de l'existence », « solaire et éolien deviennent des sources d'électricité courantes et peu coûteuses ») décrivent des évolutions largement documentées, sans les quantifier.
- Le statut de « bruit » de quatre signaux (taxis volants, cités flottantes, mondes virtuels, tourisme spatial de masse) est un **artifice de jeu**, pas un pronostic : il fallait que certains signaux ne mènent nulle part.
- Les ruptures frappent toutes le pôle le plus avancé, de façon symétrique : le jeu ne dit pas qu'un pôle est plus fragile qu'un autre.
- Aucune entreprise, marque ou personne réelle.
