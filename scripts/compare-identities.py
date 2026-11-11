#!/usr/bin/env python3
"""Compare official electoral identifiers privately; export evidence, never identifiers or confirmations."""
import argparse
import csv
import datetime
import hashlib
import io
import json
import os
import tempfile
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
YEARS = (2022, 2026)
BASE_URL = 'https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/'


def valid_identifier(value):
    if len(value) != 11 or not value.isascii() or not value.isdigit() or len(set(value)) == 1:
        return False
    for size in (9, 10):
        digit = sum(int(value[i]) * (size + 1 - i) for i in range(size)) * 10 % 11
        if int(value[size]) != (0 if digit == 10 else digit):
            return False
    return True


def index_catalog(catalog, year):
    indexed = {}
    for candidate in catalog['pessoas']:
        candidate_id = candidate['id']
        if (not isinstance(candidate_id, str) or not candidate_id.isascii()
                or not candidate_id.isdigit() or not 8 <= len(candidate_id) <= 16):
            raise ValueError('Invalid candidacy identifier in public catalog')
        if candidate.get('ano') != year or candidate_id in indexed:
            raise ValueError('Wrong year or duplicate candidacy in public catalog')
        if any(not isinstance(candidate.get(f), str) or not candidate[f].strip()
               for f in ['nome', 'uf', 'cargo', 'partido']):
            raise ValueError('Missing public candidacy fields')
        indexed[candidate_id] = candidate
    return indexed


def read_official(archive_path, year, catalog):
    """Retain only scoped candidates and their necessary fields, not the full personal dataset."""
    selected = set(index_catalog(catalog, year))
    fields = defaultdict(lambda: {'values': set(), 'invalid': False, 'rows': 0, 'public': set()})
    member = f'consulta_cand_{year}_BRASIL.csv'
    with zipfile.ZipFile(archive_path) as archive:
        if archive.namelist().count(member) != 1:
            raise ValueError('Expected exactly one national candidacy CSV for ' + str(year))
        with archive.open(member) as raw, io.TextIOWrapper(raw, encoding='latin-1', newline='') as stream:
            reader = csv.DictReader(stream, delimiter=';')
            required = {'ANO_ELEICAO', 'SQ_CANDIDATO', 'NR_CPF_CANDIDATO', 'NM_CANDIDATO', 'SG_UF', 'DS_CARGO', 'SG_PARTIDO'}
            if not required <= set(reader.fieldnames or []):
                raise ValueError('Official candidacy CSV lacks required columns')
            for row in reader:
                if row['ANO_ELEICAO'].strip() != str(year):
                    raise ValueError('Unexpected election year in official file')
                candidate = row['SQ_CANDIDATO'].strip()
                if candidate not in selected:
                    continue
                value = row['NR_CPF_CANDIDATO'].strip()
                record = fields[candidate]
                record['rows'] += 1
                if valid_identifier(value):
                    record['values'].add(value)
                else:
                    record['invalid'] = True
                record['public'].add(tuple(row[f].strip().upper() for f in ['NM_CANDIDATO', 'SG_UF', 'DS_CARGO', 'SG_PARTIDO']))
    result = {}
    for candidate in selected:
        raw = fields.get(candidate)
        state = 'nao_localizado'
        value = None
        if raw:
            if raw['invalid']:
                state = 'incompleto_ou_invalido'
            elif len(raw['values']) != 1:
                state = 'identificadores_conflitantes'
            elif len(raw['public']) != 1:
                state = 'linhas_cadastrais_conflitantes'
            else:
                state = 'apto_para_comparacao'
                value = next(iter(raw['values']))
        result[candidate] = {'state': state, 'value': value, 'public': next(iter(raw['public'])) if raw and len(raw['public']) == 1 else None}
    owners = defaultdict(list)
    for candidate, item in result.items():
        if item['value'] is not None:
            owners[item['value']].append(candidate)
    for candidates in owners.values():
        if len(candidates) > 1:
            for candidate in candidates:
                result[candidate]['state'] = 'repetido_no_recorte'
                result[candidate]['value'] = None
    return result


def file_hash(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def compare(catalogs, original, official, source_metadata, on_date):
    date = datetime.date.fromisoformat(on_date)
    if date.isoformat() != on_date:
        raise ValueError('Expected ISO date')
    indexed = {year: index_catalog(catalogs[year], year) for year in YEARS}
    pairs = {}
    for pair in original['sugestoes']:
        if pair['status'] != 'pendente_revisao_humana':
            raise ValueError('This command cannot overwrite a human identity decision')
        key = (str(pair['candidaturaId2022']), str(pair['candidaturaId2026']))
        if key in pairs or key[0] not in indexed[2022] or key[1] not in indexed[2026]:
            raise ValueError('Duplicate or unknown original candidacy pair')
        pairs[key] = 'sugestao_por_nome_e_uf'
    by_value = {item['value']: candidate for candidate, item in official[2022].items() if item['state'] == 'apto_para_comparacao'}
    for candidate, item in official[2026].items():
        if item['state'] == 'apto_para_comparacao' and item['value'] in by_value:
            pairs.setdefault((by_value[item['value']], candidate), 'coincidencia_documental_adicional')
    output = []
    for (a, b), origin in sorted(pairs.items()):
        left, right = official[2022][a], official[2026][b]
        comparable = left['state'] == right['state'] == 'apto_para_comparacao'
        outcome = ('coincidencia_documental' if left['value'] == right['value'] else 'divergencia_documental') if comparable else 'dados_insuficientes'
        rows = [indexed[2022][a], indexed[2026][b]]
        alerts = []
        for year, candidate, item in [(2022, rows[0], left), (2026, rows[1], right)]:
            public = tuple(str(candidate[f]).strip().upper() for f in ['nome', 'uf', 'cargo', 'partido'])
            if item['public'] is not None and item['public'] != public:
                alerts.append(f'campos_publicos_diferem_da_fonte_{year}')
        output.append({'candidaturaId2022': a, 'candidaturaId2026': b, 'origem': origin,
                       'resultadoConferencia': outcome, 'estadoRevisao': 'pendente_revisao_humana',
                       'qualidadeFonte2022': left['state'], 'qualidadeFonte2026': right['state'],
                       'comparacaoPublica': {'mesmoNomeCompleto': rows[0]['nome'] == rows[1]['nome'],
                                            'mesmaUf': rows[0]['uf'] == rows[1]['uf'], 'mesmoCargo': rows[0]['cargo'] == rows[1]['cargo']},
                       'alertasCadastrais': alerts})
    totals = dict(sorted(Counter(p['resultadoConferencia'] for p in output).items()))
    return {'metadados': {'versao': 1, 'dataConferencia': on_date,
            'metodo': 'Comparação local de NR_CPF_CANDIDATO válido e unívoco, associado ao SQ_CANDIDATO nos CSVs nacionais oficiais. Não é confirmação editorial.',
            'privacidade': 'Sem valores de identificadores fiscais, hashes individuais, datas de nascimento ou dados de contato no relatório.',
            'limites': 'Erros cadastrais e homônimos exigem revisão humana. Nenhum vínculo pessoal ou histórico jurídico é confirmado ou transferido por este comando.',
            'fontesOficiais': source_metadata,
            'bases': {str(year): len(indexed[year]) for year in YEARS},
            'sugestoesOriginais': len(original['sugestoes']), 'paresAdicionais': sum(p['origem'] == 'coincidencia_documental_adicional' for p in output),
            'totalPares': len(output), 'resultados': totals}, 'pares': output}


def save_snapshot(path, serialized):
    """An evidence snapshot is immutable: identical reruns are allowed, replacement is not."""
    if path.exists():
        if path.read_text(encoding='utf-8') != serialized:
            raise ValueError('Output already exists with different evidence; choose a new snapshot path')
        return
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', dir=path.parent, encoding='utf-8', delete=False) as output:
            temporary = Path(output.name)
            output.write(serialized)
        # An atomic, exclusive link prevents a concurrent process from replacing an audit.
        os.link(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cand-2022', type=Path, required=True)
    parser.add_argument('--cand-2026', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--data', default=datetime.datetime.now(ZoneInfo('America/Sao_Paulo')).date().isoformat())
    args = parser.parse_args()
    catalogs, official, metadata = {}, {}, []
    for year, archive in [(2022, args.cand_2022), (2026, args.cand_2026)]:
        path = ROOT / f'public/data/eleitos-{year}.json'
        catalogs[year] = json.loads(path.read_text(encoding='utf-8'))
        official[year] = read_official(archive, year, catalogs[year])
        metadata.append({'ano': year, 'url': BASE_URL + f'consulta_cand_{year}.zip', 'sha256Zip': file_hash(archive),
                         'arquivoCsv': f'consulta_cand_{year}_BRASIL.csv', 'sha256BaseEleitoral': file_hash(path)})
    original_path = ROOT / 'public/data/vinculos-eleitorais-pendentes.json'
    original = json.loads(original_path.read_text(encoding='utf-8'))
    report = compare(catalogs, original, official, metadata, args.data)
    report['metadados']['sha256SugestoesOriginais'] = file_hash(original_path)
    serialized = json.dumps(report, ensure_ascii=False, indent=2) + '\n'
    save_snapshot(args.output, serialized)
    print(json.dumps({k: report['metadados'][k] for k in ['sugestoesOriginais', 'paresAdicionais', 'totalPares', 'resultados']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
