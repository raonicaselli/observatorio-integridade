#!/usr/bin/env python3
"""Importação auditável dos resultados TSE 2026, com ambos os turnos.
Usa uma abrangência por ZIP, votos válidos e o último turno de cada candidatura.
"""
import argparse
import csv
import datetime
import hashlib
import io
import json
import re
import tempfile
import urllib.request
import zipfile
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'public/data/eleitos-2026.json'
BASE = 'https://cdn.tse.jus.br/estatistica/sead/odsele/'
CAND = BASE + 'consulta_cand/consulta_cand_2026.zip'
VOTE = BASE + 'votacao_candidato_munzona/votacao_candidato_munzona_2026.zip'
CARGOS = {'PRESIDENTE', 'GOVERNADOR', 'SENADOR', 'DEPUTADO FEDERAL',
          'DEPUTADO ESTADUAL', 'DEPUTADO DISTRITAL'}
ELEITOS = {'ELEITO', 'ELEITO POR QP', 'ELEITO POR MÉDIA', 'ELEITO POR MEDIA'}
UFS = set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split())


def fetch(url, filename, directory):
    path = Path(filename) if filename else directory / url.rsplit('/', 1)[-1]
    if not filename:
        req = urllib.request.Request(url, headers={'User-Agent': 'ObservatorioIntegridade/1.0'})
        with urllib.request.urlopen(req, timeout=120) as response, path.open('wb') as out:
            while chunk := response.read(1024 * 1024):
                out.write(chunk)
    digest = hashlib.sha256()
    with path.open('rb') as source:
        while chunk := source.read(1024 * 1024):
            digest.update(chunk)
    if not zipfile.is_zipfile(path):
        raise ValueError('Arquivo não é ZIP: ' + url)
    return path, digest.hexdigest()


def members(archive, prefix):
    """Nunca somar o arquivo nacional aos arquivos regionais equivalentes."""
    available = [n for n in archive.namelist() if Path(n).name.startswith(prefix + '_') and n.lower().endswith('.csv')]
    national = [n for n in available if Path(n).name == prefix + '_BRASIL.csv']
    if len(national) == 1:
        return national
    if len(national) > 1:
        raise ValueError('Abrangência nacional duplicada')
    partitions = {Path(n).stem.rsplit('_', 1)[-1]: n for n in available}
    if set(partitions) != UFS | {'BR'} or len(partitions) != len(available):
        raise ValueError('ZIP sem abrangência nacional ou conjunto completo de UFs e BR')
    return [partitions[uf] for uf in sorted(partitions)]


def table(path, prefix):
    with zipfile.ZipFile(path) as archive:
        for name in members(archive, prefix):
            with archive.open(name) as raw, io.TextIOWrapper(raw, encoding='latin-1', newline='') as text:
                yield from csv.DictReader(text, delimiter=';', quotechar='"')


def text(row, key):
    return str(row.get(key, '')).strip()


def scope(row):
    if text(row, 'ANO_ELEICAO') != '2026' or text(row, 'CD_TIPO_ELEICAO') != '2':
        raise ValueError('Esperada eleição ordinária de 2026')
    turno = int(text(row, 'NR_TURNO'))
    if turno not in (1, 2):
        raise ValueError('Turno inválido')
    return turno


def build(candidaturas, votacao, on_date):
    candidates, candidate_turns, states = {}, set(), set()
    for row in candidaturas:
        turno = scope(row)
        candidate_turns.add(turno)
        if text(row, 'SG_PARTIDO') != 'PL' or text(row, 'DS_CARGO').upper() not in CARGOS:
            continue
        key = (text(row, 'SQ_CANDIDATO'), turno)
        record = {k: text(row, k) for k in ('NM_CANDIDATO', 'NM_URNA_CANDIDATO', 'SG_UF', 'DS_SIT_TOT_TURNO')}
        record['DS_CARGO'] = text(row, 'DS_CARGO').upper()
        if key in candidates and candidates[key] != record:
            raise ValueError('Cadastro divergente para candidatura/turno: ' + str(key))
        candidates[key] = record
    if candidate_turns != {1, 2}:
        raise ValueError('Cadastro não contém os dois turnos')
    latest = {}
    for id, turno in candidates:
        latest[id] = max(turno, latest.get(id, 0))
    if any(candidates[id, turno]['DS_SIT_TOT_TURNO'].upper() in {'2º TURNO', '2° TURNO'}
           for id, turno in latest.items()):
        raise ValueError('Cadastro ainda contém disputa de segundo turno sem desfecho')
    eligible = {(id, turno): candidates[id, turno] for id, turno in latest.items()
                if candidates[id, turno]['DS_SIT_TOT_TURNO'].upper() in ELEITOS}
    sums, seen, vote_turns, checked_latest = Counter(), set(), set(), set()
    for row in votacao:
        turno = scope(row)
        vote_turns.add(turno)
        states.add(text(row, 'SG_UF'))
        key = (text(row, 'SQ_CANDIDATO'), turno)
        if key not in candidates or latest[key[0]] != turno:
            continue
        c = candidates[key]
        if (text(row, 'SG_PARTIDO') != 'PL' or text(row, 'DS_CARGO').upper() != c['DS_CARGO']
                or text(row, 'DS_SIT_TOT_TURNO').upper() != c['DS_SIT_TOT_TURNO'].upper()
                or (c['SG_UF'] != 'BR' and text(row, 'SG_UF') != c['SG_UF'])):
            raise ValueError('Cadastro e votação divergem: ' + str(key))
        checked_latest.add(key)
        if key not in eligible:
            continue
        row_key = key + tuple(text(row, k) for k in ('CD_ELEICAO', 'SG_UF', 'CD_MUNICIPIO', 'NR_ZONA',
                                                     'ST_VOTO_EM_TRANSITO', 'NM_TIPO_DESTINACAO_VOTOS'))
        if row_key in seen:
            raise ValueError('Linha de votação duplicada: ' + str(row_key))
        seen.add(row_key)
        value = text(row, 'QT_VOTOS_NOMINAIS_VALIDOS')
        if not re.fullmatch(r'\d+', value):
            raise ValueError('Votos nominais válidos ausentes ou inválidos: ' + str(key))
        sums[key] += int(value)
    if vote_turns != {1, 2} or not UFS <= states:
        raise ValueError('Votação sem os dois turnos ou sem todas as UFs')
    # Indeferidas/renúncias no primeiro turno podem legitimamente não ter votos.
    required = set(eligible) | {(id, turno) for id, turno in latest.items() if turno == 2}
    if not required <= checked_latest:
        raise ValueError('Eleito ou participante do segundo turno sem votação: ' + repr(sorted(required - checked_latest)))
    records = []
    for (id, turno), c in eligible.items():
        if (id, turno) not in sums:
            raise ValueError('Eleito sem votação: ' + id)
        if not re.fullmatch(r'\d{8,16}', id) or not c['NM_CANDIDATO'] or not c['NM_URNA_CANDIDATO']:
            raise ValueError('Identidade eleitoral incompleta')
        if c['SG_UF'] not in UFS | {'BR'} or (c['SG_UF'] == 'BR') != (c['DS_CARGO'] == 'PRESIDENTE'):
            raise ValueError('UF incompatível com cargo')
        if turno == 2 and c['DS_CARGO'] not in {'GOVERNADOR', 'PRESIDENTE'}:
            raise ValueError('Cargo incompatível com segundo turno')
        records.append({'id': id, 'ano': 2026, 'turno': turno, 'nome': c['NM_CANDIDATO'],
                        'nomeUrna': c['NM_URNA_CANDIDATO'], 'cargo': c['DS_CARGO'], 'uf': c['SG_UF'],
                        'partido': 'PL', 'votosValidos': sums[id, turno],
                        'situacaoTotalizacao': c['DS_SIT_TOT_TURNO'].upper(), 'situacaoPesquisa': 'nao_iniciada'})
    if not records:
        raise ValueError('Nenhum eleito encontrado')
    return {'metadados': {'ano': 2026, 'turnos': [1, 2], 'partido': 'PL', 'quantidade': len(records),
            'atualizadoEm': on_date, 'situacao': 'resultados_dos_dois_turnos_sujeitos_a_retotalizacao',
            'distribuicaoPorCargo': dict(sorted(Counter(r['cargo'] for r in records).items())),
            'distribuicaoPorTurno': dict(sorted(Counter(str(r['turno']) for r in records).items())),
            'fontePrimaria': 'https://dadosabertos.tse.jus.br/',
            'metodo': 'Uma abrangência por ZIP; último turno da candidatura; soma de QT_VOTOS_NOMINAIS_VALIDOS por município/zona, sem somar turnos.',
            'aviso': 'Resultados dos dois turnos de 2026 consultados na data indicada. Sujeitos a retotalizações e decisões judiciais posteriores; não é certificação de diplomação.'},
            'pessoas': sorted(records, key=lambda r: (r['nome'], r['uf'], r['id']))}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cand-zip')
    parser.add_argument('--votes-zip')
    parser.add_argument('--output', type=Path, default=OUTPUT)
    args = parser.parse_args()
    with tempfile.TemporaryDirectory() as temp:
        print('Preparando arquivos oficiais', flush=True)
        cand, cand_sha = fetch(CAND, args.cand_zip, Path(temp))
        votes, votes_sha = fetch(VOTE, args.votes_zip, Path(temp))
        print('Lendo cadastro e votação em streaming, sem extrair os CSVs', flush=True)
        output = build(table(cand, 'consulta_cand_2026'), table(votes, 'votacao_candidato_munzona_2026'), datetime.date.today().isoformat())
        output['metadados']['arquivosOriginais'] = [{'url': CAND, 'sha256': cand_sha}, {'url': VOTE, 'sha256': votes_sha}]
        # Write only after all checks succeed; readers never receive a partial JSON.
        target = args.output
        with tempfile.NamedTemporaryFile(mode='w', dir=target.parent, prefix='.' + target.name, suffix='.tmp',
                                         encoding='utf-8', delete=False) as tmp:
            json.dump(output, tmp, ensure_ascii=False, indent=2)
            tmp.write('\n')
            tmp_path = Path(tmp.name)
        tmp_path.replace(target)
        print(json.dumps(output['metadados'], ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
