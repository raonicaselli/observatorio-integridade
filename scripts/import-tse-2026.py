#!/usr/bin/env python3
"""Importa os eleitos do PL no 1o turno de 2026 a partir de dois ZIPs oficiais do TSE.
Os filtros usam o status de TOTALIZACAO, nao situacao de candidatura.
Arquivo jamais e publicado se os dados nao passarem nas verificacoes.
"""
import argparse,csv,datetime,hashlib,io,json,os,re,urllib.request,zipfile
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'public/data/eleitos-2026.json'
CAND='https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip'
VOTE='https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2026.zip'

def fetch(url,filename):
    if filename:
        data=Path(filename).read_bytes()
    else:
        req=urllib.request.Request(url,headers={'User-Agent':'ObservatorioIntegridade/0.7 dados publicos'})
        with urllib.request.urlopen(req,timeout=120) as r:
            data=r.read()
    if not zipfile.is_zipfile(io.BytesIO(data)):
        raise ValueError('Arquivo nao e ZIP validado: '+url)
    return data,hashlib.sha256(data).hexdigest()

def table(zip_bytes,terms):
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
        members=[n for n in z.namelist() if n.lower().endswith('.csv') and any(t in n.lower() for t in terms)]
        if not members: raise ValueError('CSV esperado nao localizado no arquivo oficial: '+repr(z.namelist()[:10]))
        for filename in members:
            with z.open(filename) as raw:
                with io.TextIOWrapper(raw,encoding='latin-1',newline='') as file:
                    reader=csv.DictReader(file,delimiter=';',quotechar='"')
                    for row in reader:
                        yield {str(k).lstrip('\ufeff'):v for k,v in row.items() if k is not None}

def field(row,*keys):
    for key in keys:
        value=row.get(key)
        if value is not None and str(value).strip():return str(value).strip()
    return ''

def elected(value):
    s=value.upper().strip()
    return s.startswith('ELEITO') or s in ('ELEITO POR QP','ELEITO POR MEDIA','ELEITO POR MÉDIA')

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--cand-zip')
    p.add_argument('--votes-zip')
    args=p.parse_args()
    print('Baixando consulta de candidaturas oficial TSE 2026',flush=True)
    cand_data,cand_sha=fetch(CAND,args.cand_zip)
    print('Baixando totalizacao oficial TSE 2026',flush=True)
    votes_data,votes_sha=fetch(VOTE,args.votes_zip)
    candid={}
    for r in table(cand_data,['consulta_cand_2026']):
        if field(r,'SG_PARTIDO').upper()!='PL':continue
        key=field(r,'SQ_CANDIDATO')
        if not key:continue
        prev=candid.get(key)
        if prev is None or field(r,'DS_SITUACAO_CANDIDATURA')=='APTO':
            candid[key]=r
    print('Candidaturas PL encontradas:',len(candid),flush=True)
    votes={}
    statuses=Counter()
    for r in table(votes_data,['votacao_candidato_munzona_2026']):
        if field(r,'NR_TURNO')!='1' or field(r,'SG_PARTIDO').upper()!='PL':continue
        if field(r,'CD_CARGO') in ('2','4','6','7','8') or field(r,'DS_CARGO').upper() in ('VICE-GOVERNADOR','1º SUPLENTE','2º SUPLENTE'):continue
        status=field(r,'DS_SIT_TOT_TURNO','DS_SIT_TOT_TURNO_SUP')
        statuses[status]+=1
        if not elected(status):continue
        key=field(r,'SQ_CANDIDATO')
        if not key:continue
        info=votes.setdefault(key,{'votes':0,'statuses':set(),'cargo':field(r,'DS_CARGO'),'uf':field(r,'SG_UF'),'n':0})
        info['votes']+=int(field(r,'QT_VOTOS_NOMINAIS') or '0')
        info['statuses'].add(status)
        info['n']+=1
    print('Situacoes identificadas (linhas):',statuses.most_common(12),flush=True)
    print('Candidatos eleitos unicos PL 2026:',len(votes),flush=True)
    records=[]
    for id,info in votes.items():
        c=candid.get(id)
        if not c:raise ValueError('Eleito presente na totalizacao, ausente no cadastro PL: '+id)
        cargo=(info['cargo'] or field(c,'DS_CARGO')).upper()
        uf=info['uf'] or field(c,'SG_UF')
        nome=field(c,'NM_CANDIDATO')
        urna=field(c,'NM_URNA_CANDIDATO')
        if not (nome and urna and re.fullmatch('[A-Z]{2}',uf)):
            raise ValueError('Dados incompletos: '+id)
        records.append({'id':id,'ano':2026,'turno':1,'nome':nome,'nomeUrna':urna,'cargo':cargo,'uf':uf,'partido':'PL','votosValidos':info['votes'],'situacaoTotalizacao':'; '.join(sorted(info['statuses'])),'situacaoPesquisa':'nao_iniciada'})
    count=Counter(x['cargo'] for x in records)
    print('Distribuicao:',dict(count),flush=True)
    if count['DEPUTADO FEDERAL']!=121:
        raise ValueError('Deputados federais PL 2026: '+str(count['DEPUTADO FEDERAL'])+'; referencia documentada 121. Nao publicar antes de revisao.')
    if len(records)<121:raise ValueError('Total muito baixo')
    output={'metadados':{'ano':2026,'turno':1,'partido':'PL','quantidade':len(records),'atualizadoEm':datetime.date.today().isoformat(),'situacao':'apuracao_do_primeiro_turno_sujeita_a_retotalizacao','distribuicaoPorCargo':dict(count),'fontePrimaria':'https://dadosabertos.tse.jus.br/','arquivosOriginais':[{'url':CAND,'sha256':cand_sha},{'url':VOTE,'sha256':votes_sha}],'aviso':'Somente eleitos titulares do primeiro turno. Sujeito a retotalizacao ou decisao judicial posterior.'},'pessoas':sorted(records,key=lambda x:(x['nome'],x['uf']))}
    OUTPUT.write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('CONCLUIDO:',len(records),'eleitos PL; arquivo',OUTPUT,flush=True)

if __name__=='__main__':main()
