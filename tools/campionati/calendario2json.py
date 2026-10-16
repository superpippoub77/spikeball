#!/usr/bin/env python3
"""Converte un calendario copiato dal sito della federazione (testo) in un campionato di campionati.json.

Uso: python3 calendario2json.py calendario.txt ../../campionati.json --id 1DIV-M-2026 --nome "Prima Divisione Maschile 2026/27"
Se campionati.json esiste già, il campionato con lo stesso id viene sostituito e gli altri restano.
"""
import argparse, json, os, re

DATE = re.compile(r'^(Lun|Mar|Mer|Gio|Ven|Sab|Dom)\s+(\d{2})/(\d{2})/(\d{4})\s*·\s*(\d{1,2})[.:](\d{2})$')
RES = re.compile(r'^(\d)\s*[–-]\s*(\d)$')

def parse(text):
    lines = [l.strip() for l in text.splitlines()]
    giornate, cur, g = {}, 1, None
    i = 0
    def nxt(j):
        while j < len(lines) and not lines[j]: j += 1
        return j
    while i < len(lines):
        l = lines[i]
        m = re.match(r'^Giornata\s+(\d+)', l, re.I)
        if m: cur = int(m.group(1)); i += 1; continue
        m = DATE.match(l)
        if not m: i += 1; continue
        _, d, mo, y, hh, mm = m.groups()
        g = {'giornata': cur, 'data': f'{y}-{mo}-{d}', 'ora': f'{int(hh):02d}:{mm}'}
        i = nxt(i + 1)
        m = re.match(r'^Gara\s+(\d+)', lines[i]) if i < len(lines) else None
        if m: g['gara'] = int(m.group(1)); i = nxt(i + 1)
        if i < len(lines) and lines[i].lower() == 'impianto': i = nxt(i + 1); g['impianto'] = lines[i]; i = nxt(i + 1)
        g['casa'] = lines[i]; i = nxt(i + 1)
        r = lines[i]; i = nxt(i + 1)
        m = RES.match(r)
        if m: g['risultato'] = [int(m.group(1)), int(m.group(2))]
        if i < len(lines) and lines[i].lower().startswith('parziali'):
            g['parziali'] = [p.strip().replace(' ', '') for p in lines[i].split(':', 1)[1].split('·') if p.strip()]
            i = nxt(i + 1)
        g['ospite'] = lines[i]; i = nxt(i + 1)
        if i < len(lines) and lines[i].lower() == 'arbitri':
            i = nxt(i + 1)
            arb = lines[i] if i < len(lines) else ''
            if arb and arb.upper() not in ('DESIGNATO', 'DA DESIGNARE'): g['arbitro'] = arb
            i += 1
        giornate.setdefault(cur, []).append(g)
    return giornate

ap = argparse.ArgumentParser()
ap.add_argument('txt'); ap.add_argument('out'); ap.add_argument('--id', required=True); ap.add_argument('--nome', required=True)
ap.add_argument('--set', type=int, default=3, help='set da giocare nelle tue partite (1, 3 o 5)')
a = ap.parse_args()
gior = parse(open(a.txt, encoding='utf-8').read())
squadre = []
for n in sorted(gior):
    for g in gior[n]:
        for t in (g['casa'], g['ospite']):
            if t not in squadre: squadre.append(t)
camp = {'id': a.id, 'nome': a.nome, 'set': a.set, 'squadre': [{'nome': s} for s in squadre],
        'giornate': [{'numero': n, 'gare': [{k: v for k, v in g.items() if k != 'giornata'} for g in gior[n]]} for n in sorted(gior)]}
data = {'campionati': []}
if os.path.exists(a.out):
    data = json.load(open(a.out, encoding='utf-8'))
data['campionati'] = [c for c in data.get('campionati', []) if c.get('id') != a.id] + [camp]
json.dump(data, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
ng = sum(len(v) for v in gior.values())
print(f'{a.nome}: {len(squadre)} squadre, {len(gior)} giornate, {ng} gare, {sum(1 for v in gior.values() for g in v if "risultato" in g)} con risultato')
