#!/bin/sh
# usage: cues.sh FROM TO  (prints narration, visual note and word cues for scene ids FROM..TO)
cd "$(dirname "$0")/.."
awk -F' [|] ' -v a="$1" -v b="$2" '($1+0>=a && $1+0<=b && $1 ~ /^[0-9][0-9]$/){print $1" | "$2" | "$3}' viet-su/scenes.md
node -e "
const fs=require('fs');const f='/tmp/_vt'+process.pid+'.js';fs.writeFileSync(f,fs.readFileSync('src/scenes/vs_times.js','utf8')+';module.exports={VS_TIMES}');
const {VS_TIMES}=require(f);fs.unlinkSync(f);
for(const S of VS_TIMES.filter(s=>+s.id>=+process.argv[1]&&+s.id<=+process.argv[2])){console.log(S.id,(S.end-S.start).toFixed(1),S.words.map(w=>w[0]+':'+w[1].toFixed(1)).join(' '))}
" "$1" "$2"
