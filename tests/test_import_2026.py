"""Synthetic election fixtures: no assertions about real election outcomes."""
import importlib.util
import unittest
import zipfile
import io
from pathlib import Path

spec = importlib.util.spec_from_file_location('import2026', Path(__file__).resolve().parents[1] / 'scripts/import-tse-2026.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def candidate(id='00000000001', turno=1, cargo='GOVERNADOR', status='ELEITO', uf='SP'):
    return {'ANO_ELEICAO': '2026', 'CD_TIPO_ELEICAO': '2', 'NR_TURNO': str(turno),
            'SQ_CANDIDATO': id, 'SG_PARTIDO': 'PL', 'DS_CARGO': cargo, 'SG_UF': uf,
            'NM_CANDIDATO': 'PESSOA FICTÍCIA', 'NM_URNA_CANDIDATO': 'FICTÍCIA', 'DS_SIT_TOT_TURNO': status}


def vote(c, valid='10', municipality='1'):
    return {**c, 'CD_ELEICAO': '1', 'CD_MUNICIPIO': municipality, 'NR_ZONA': '1',
            'ST_VOTO_EM_TRANSITO': 'N', 'NM_TIPO_DESTINACAO_VOTOS': 'Válido',
            'QT_VOTOS_NOMINAIS_VALIDOS': valid, 'QT_VOTOS_NOMINAIS': '999'}


def fixture(candidates, votes):
    # Coverage rows are not PL elected candidates; their votes never enter the result.
    other = [{**candidate(id='99999999999', uf=uf), 'SG_PARTIDO': 'OUTRO'} for uf in module.UFS]
    other.append({**candidate(id='99999999999', turno=2), 'SG_PARTIDO': 'OUTRO'})
    return candidates + other, votes + [vote(c) for c in other]


class ImportTests(unittest.TestCase):
    def run_import(self, candidates, votes):
        return module.build(*fixture(candidates, votes), '2026-11-11')

    def test_second_turn_uses_only_winning_turn_and_valid_votes(self):
        first = candidate(status='2º TURNO')
        second = candidate(turno=2)
        result = self.run_import([first, second], [vote(first, '100'), vote(second, '60'), vote(second, '70', '2')])
        self.assertEqual(len(result['pessoas']), 1)
        self.assertEqual(result['pessoas'][0]['turno'], 2)
        self.assertEqual(result['pessoas'][0]['votosValidos'], 130)

    def test_non_elected_final_turn_does_not_keep_stale_first_turn_winner(self):
        first = candidate(status='ELEITO')
        second = candidate(turno=2, status='NÃO ELEITO')
        deputy = candidate(id='00000000002', cargo='DEPUTADO FEDERAL')
        result = self.run_import([first, second, deputy], [vote(first), vote(second), vote(deputy)])
        self.assertEqual([p['id'] for p in result['pessoas']], ['00000000002'])

    def test_first_turn_winners_remain_and_totals_are_not_fixed_at_121(self):
        c = candidate(cargo='DEPUTADO FEDERAL')
        result = self.run_import([c], [vote(c)])
        self.assertEqual(result['metadados']['quantidade'], 1)
        self.assertEqual(result['pessoas'][0]['turno'], 1)

    def test_supplents_excluded(self):
        c, vice = candidate(), candidate(id='00000000002', cargo='VICE-GOVERNADOR')
        self.assertEqual(len(self.run_import([c, vice], [vote(c), vote(vice)])['pessoas']), 1)

    def test_president_has_national_scope(self):
        c = candidate(turno=2, cargo='PRESIDENTE', uf='BR')
        result = self.run_import([c], [{**vote(c), 'SG_UF': 'SP'}])
        self.assertEqual(result['pessoas'][0]['uf'], 'BR')

    def test_duplicate_vote_rejected(self):
        c = candidate()
        with self.assertRaisesRegex(ValueError, 'duplicada'):
            self.run_import([c], [vote(c), vote(c)])

    def test_missing_valid_votes_not_replaced_by_nominal_votes(self):
        c = candidate()
        with self.assertRaisesRegex(ValueError, 'Votos nominais válidos'):
            self.run_import([c], [vote(c, '')])

    def test_disagreement_between_registration_and_totalization_rejected(self):
        c = candidate()
        with self.assertRaisesRegex(ValueError, 'divergem'):
            self.run_import([c], [{**vote(c), 'DS_SIT_TOT_TURNO': 'NÃO ELEITO'}])

    def test_elected_without_votes_rejected(self):
        with self.assertRaisesRegex(ValueError, 'sem votação'):
            self.run_import([candidate()], [])

    def test_incomplete_turn_coverage_rejected(self):
        c = candidate()
        with self.assertRaisesRegex(ValueError, 'dois turnos'):
            module.build([c], [vote(c)], '2026-11-11')

    def test_duplicate_national_and_uf_files_not_added(self):
        with zipfile.ZipFile(io.BytesIO(), 'w') as archive:
            archive.writestr('votacao_2026_BRASIL.csv', 'national')
            archive.writestr('votacao_2026_SP.csv', 'regional')
            self.assertEqual(module.members(archive, 'votacao_2026'), ['votacao_2026_BRASIL.csv'])

    def test_incomplete_regional_archive_rejected(self):
        with zipfile.ZipFile(io.BytesIO(), 'w') as archive:
            archive.writestr('votacao_2026_SP.csv', 'regional')
            with self.assertRaisesRegex(ValueError, 'conjunto completo'):
                module.members(archive, 'votacao_2026')

    def test_pending_runoff_not_reported_as_complete(self):
        c = candidate(status='2º TURNO')
        with self.assertRaisesRegex(ValueError, 'sem desfecho'):
            self.run_import([c], [vote(c)])

    def test_supplementary_election_rejected(self):
        c = {**candidate(), 'CD_TIPO_ELEICAO': '1'}
        with self.assertRaisesRegex(ValueError, 'ordinária'):
            self.run_import([c], [vote(c)])


if __name__ == '__main__':
    unittest.main()
