"""Identity evidence tests use invented records and runtime-only synthetic identifiers."""
import csv
import hashlib
import importlib.util
import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

spec = importlib.util.spec_from_file_location('identity_comparison', Path(__file__).resolve().parents[1] / 'scripts/compare-identities.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def identifier(seed):
    value = str(seed).zfill(9)
    for size in (9, 10):
        digit = sum(int(value[i]) * (size + 1 - i) for i in range(size)) * 10 % 11
        value += str(0 if digit == 10 else digit)
    return value


def catalog(year, candidates):
    return {'pessoas': [{'id': id, 'ano': year, 'nome': name, 'uf': uf,
                         'cargo': 'DEPUTADO FEDERAL', 'partido': 'PL'} for id, name, uf in candidates]}


def archive(path, year, rows, regional=False):
    columns = ['ANO_ELEICAO', 'SQ_CANDIDATO', 'NR_CPF_CANDIDATO', 'NM_CANDIDATO', 'SG_UF', 'DS_CARGO', 'SG_PARTIDO']
    stream = io.StringIO()
    writer = csv.DictWriter(stream, fieldnames=columns, delimiter=';')
    writer.writeheader()
    for id, value, name, uf in rows:
        writer.writerow(dict(zip(columns, [year, id, value, name, uf, 'DEPUTADO FEDERAL', 'PL'])))
    with zipfile.ZipFile(path, 'w') as output:
        suffix = 'SP' if regional else 'BRASIL'
        output.writestr(f'consulta_cand_{year}_{suffix}.csv', stream.getvalue().encode('latin-1'))


class IdentityTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        self.catalogs = {2022: catalog(2022, [('100000000001', 'Pessoa fictícia Alfa', 'SP')]),
                         2026: catalog(2026, [('200000000001', 'Pessoa fictícia Alfa', 'SP')])}
        self.original = {'sugestoes': [{'candidaturaId2022': '100000000001', 'candidaturaId2026': '200000000001',
                                        'status': 'pendente_revisao_humana'}]}

    def tearDown(self):
        self.directory.cleanup()

    def records(self, year, values):
        rows = self.catalogs[year]['pessoas']
        path = self.root / f'{year}.zip'
        archive(path, year, [(r['id'], v, r['nome'], r['uf']) for r, v in zip(rows, values)])
        return module.read_official(path, year, self.catalogs[year])

    def compare(self, left, right, original=None):
        return module.compare(self.catalogs, original or self.original, {2022: left, 2026: right}, [], '2026-11-11')

    def test_equal_identifiers_create_evidence_but_never_confirmation(self):
        value = identifier(12345)
        result = self.compare(self.records(2022, [value]), self.records(2026, [value]))
        self.assertEqual(result['pares'][0]['resultadoConferencia'], 'coincidencia_documental')
        self.assertEqual(result['pares'][0]['estadoRevisao'], 'pendente_revisao_humana')
        encoded = json.dumps(result)
        self.assertNotIn(value, encoded)
        self.assertNotIn(hashlib.sha256(value.encode()).hexdigest(), encoded)
        self.assertNotIn('pessoaId', encoded)

    def test_same_name_and_uf_cannot_override_different_official_identifier(self):
        result = self.compare(self.records(2022, [identifier(12345)]), self.records(2026, [identifier(67890)]))
        self.assertEqual(result['pares'][0]['resultadoConferencia'], 'divergencia_documental')
        self.assertEqual(result['pares'][0]['estadoRevisao'], 'pendente_revisao_humana')

    def test_missing_masked_repeated_and_invalid_check_digits_are_inconclusive(self):
        for value in ['', '***.***.***-**', '0' * 11, identifier(12345)[:-1] + str((int(identifier(12345)[-1]) + 1) % 10)]:
            with self.subTest(kind='invalid_or_masked'):
                result = self.compare(self.records(2022, [value]), self.records(2026, [identifier(12345)]))
                self.assertEqual(result['pares'][0]['resultadoConferencia'], 'dados_insuficientes')

    def test_changed_name_and_uf_do_not_hide_additional_documentary_pair(self):
        self.catalogs[2026]['pessoas'][0].update(nome='Outra grafia fictícia', uf='RJ')
        result = self.compare(self.records(2022, [identifier(12345)]), self.records(2026, [identifier(12345)]), {'sugestoes': []})
        self.assertEqual(result['metadados']['paresAdicionais'], 1)
        self.assertFalse(result['pares'][0]['comparacaoPublica']['mesmaUf'])
        self.assertFalse(result['pares'][0]['comparacaoPublica']['mesmoNomeCompleto'])
        self.assertEqual(result['pares'][0]['estadoRevisao'], 'pendente_revisao_humana')

    def test_duplicate_identifier_in_same_year_is_ambiguous_not_a_many_to_one_confirmation(self):
        self.catalogs[2022]['pessoas'].append(dict(self.catalogs[2022]['pessoas'][0], id='100000000002'))
        value = identifier(12345)
        left = self.records(2022, [value, value])
        self.assertTrue(all(r['state'] == 'repetido_no_recorte' and r['value'] is None for r in left.values()))
        result = self.compare(left, self.records(2026, [value]))
        self.assertEqual(result['pares'][0]['resultadoConferencia'], 'dados_insuficientes')
        self.assertEqual(result['metadados']['paresAdicionais'], 0)

    def test_repeated_turn_with_identical_data_is_not_a_duplicate_person(self):
        p = self.catalogs[2022]['pessoas'][0]
        path = self.root / 'turnos.zip'
        row = (p['id'], identifier(12345), p['nome'], p['uf'])
        archive(path, 2022, [row, row])
        result = module.read_official(path, 2022, self.catalogs[2022])
        self.assertEqual(result[p['id']]['state'], 'apto_para_comparacao')

    def test_conflicting_identifier_between_rows_is_not_chosen_arbitrarily(self):
        p = self.catalogs[2022]['pessoas'][0]
        path = self.root / 'conflito.zip'
        archive(path, 2022, [(p['id'], identifier(seed), p['nome'], p['uf']) for seed in [12345, 67890]])
        self.assertEqual(module.read_official(path, 2022, self.catalogs[2022])[p['id']]['state'], 'identificadores_conflitantes')

    def test_absent_candidate_is_reported_without_guessing_from_name(self):
        path = self.root / 'ausente.zip'
        archive(path, 2022, [])
        result = self.compare(module.read_official(path, 2022, self.catalogs[2022]), self.records(2026, [identifier(12345)]))
        self.assertEqual(result['pares'][0]['qualidadeFonte2022'], 'nao_localizado')

    def test_national_archive_required_and_wrong_year_rejected(self):
        path = self.root / 'regional.zip'
        archive(path, 2022, [], regional=True)
        with self.assertRaisesRegex(ValueError, 'national'):
            module.read_official(path, 2022, self.catalogs[2022])
        archive(path, 2022, [('100000000001', identifier(12345), 'Pessoa fictícia Alfa', 'SP')])
        with zipfile.ZipFile(path) as source:
            content = source.read('consulta_cand_2022_BRASIL.csv').replace(b'2022;', b'2026;')
        with zipfile.ZipFile(path, 'w') as output:
            output.writestr('consulta_cand_2022_BRASIL.csv', content)
        with self.assertRaisesRegex(ValueError, 'year'):
            module.read_official(path, 2022, self.catalogs[2022])

    def test_conflicting_public_fields_between_turn_rows_prevent_comparison(self):
        p = self.catalogs[2022]['pessoas'][0]
        path = self.root / 'nomes.zip'
        archive(path, 2022, [(p['id'], identifier(12345), name, p['uf'])
                             for name in [p['nome'], 'Outro cadastro fictício']])
        result = module.read_official(path, 2022, self.catalogs[2022])
        self.assertEqual(result[p['id']]['state'], 'linhas_cadastrais_conflitantes')
        self.assertIsNone(result[p['id']]['value'])

    def test_source_catalog_discrepancy_is_exposed_for_human_review(self):
        left = self.records(2022, [identifier(12345)])
        right = self.records(2026, [identifier(12345)])
        self.catalogs[2026]['pessoas'][0]['nome'] = 'Grafia desatualizada fictícia'
        result = self.compare(left, right)
        self.assertEqual(result['pares'][0]['alertasCadastrais'], ['campos_publicos_diferem_da_fonte_2026'])
        self.assertEqual(result['pares'][0]['estadoRevisao'], 'pendente_revisao_humana')

    def test_valid_and_masked_rows_for_same_candidate_remain_inconclusive(self):
        p = self.catalogs[2022]['pessoas'][0]
        path = self.root / 'parcial.zip'
        archive(path, 2022, [(p['id'], value, p['nome'], p['uf']) for value in [identifier(12345), '***']])
        self.assertEqual(module.read_official(path, 2022, self.catalogs[2022])[p['id']]['state'], 'incompleto_ou_invalido')

    def test_catalog_year_and_duplicate_ids_are_rejected(self):
        self.catalogs[2022]['pessoas'][0]['ano'] = 2026
        with self.assertRaisesRegex(ValueError, 'Wrong year'):
            self.records(2022, [identifier(12345)])
        self.catalogs[2022]['pessoas'][0]['ano'] = 2022
        self.catalogs[2022]['pessoas'].append(dict(self.catalogs[2022]['pessoas'][0]))
        with self.assertRaisesRegex(ValueError, 'duplicate'):
            self.records(2022, [identifier(12345), identifier(67890)])

    def test_saved_snapshot_is_repeatable_and_different_content_cannot_overwrite_it(self):
        path = self.root / 'evidencias.json'
        module.save_snapshot(path, '{"resultado":"pendente"}')
        original = path.read_bytes()
        module.save_snapshot(path, '{"resultado":"pendente"}')
        self.assertEqual(path.read_bytes(), original)
        with self.assertRaisesRegex(ValueError, 'different evidence'):
            module.save_snapshot(path, '{"resultado":"outro"}')
        self.assertEqual(path.read_bytes(), original)
        self.assertEqual(list(self.root.iterdir()), [path])

    def test_existing_human_decision_cannot_be_overwritten(self):
        self.original['sugestoes'][0]['status'] = 'confirmado'
        value = identifier(12345)
        with self.assertRaisesRegex(ValueError, 'human identity decision'):
            self.compare(self.records(2022, [value]), self.records(2026, [value]))

    def test_duplicate_original_pair_rejected(self):
        self.original['sugestoes'].append(dict(self.original['sugestoes'][0]))
        value = identifier(12345)
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            self.compare(self.records(2022, [value]), self.records(2026, [value]))


if __name__ == '__main__':
    unittest.main()
