"""يدمج ملفات questions_ch*_lesson*.json في questions-import.json ويعمل Validation."""
import json,glob,sys,collections
src=sys.argv[1] if len(sys.argv)>1 else '.'
out=[];errs=[]
for f in sorted(glob.glob(f'{src}/questions_ch*_lesson*.json')):
    for i,q in enumerate(json.load(open(f))):
        q['marks']=q.get('marks') or 1
        if q.get('active') is None: q['active']=True
        q['needs_review']=bool(q.get('review_notes'))
        for k in ('chapter','lesson','section','question_type','question_text'):
            if not q.get(k): errs.append(f'{f}#{i}: missing {k}')
        if q['question_type']!='essay' and q.get('correct_answer') in (None,'',[]): errs.append(f'{f}#{i}: no answer'); q['needs_review']=True
        out.append(q)
keys=collections.Counter((q['lesson'],q['section'],q.get('group_title'),q.get('number_in_group'),q['question_type'],q.get('source_page')) for q in out)
errs+=[f'duplicate key {k}' for k,v in keys.items() if v>1]
json.dump(out,open('questions-import.json','w'),ensure_ascii=False,indent=1)
print(len(out),'questions;',sum(q['needs_review'] for q in out),'need review;',len(errs),'errors');print(*errs[:20],sep='\n')
