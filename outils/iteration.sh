#!/bin/bash
# Protocole d'une itération de règles : recalibrer les bots de référence (2 passes), puis mesurer.
# usage : outils/iteration.sh <version> [parties] [duels]
set -e
V=$1; N=${2:-2000}; D=${3:-300}
for i in 1 2; do
  npx tsx simulateur/src/cli.ts adverse --generations 7 --finales 600 --adopter 1 --graine $((100+i)) 2>/dev/null | grep -A1 "Finalistes" | tail -1 | cut -c1-200
done
npx tsx simulateur/src/cli.ts explorer --parties $N --duels $D --graine 2075 --sortie simulations/resume-v$V.json 2>/dev/null
