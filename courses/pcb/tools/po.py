import sys,re
def parse(fn):
    d={}; cur=None; mid=None; mstr=None; state=None; ctx=None
    def flush():
        if mid is not None and mstr is not None:
            d.setdefault(mid,[]).append(mstr)
    for line in open(fn,encoding='utf-8'):
        line=line.rstrip('\n')
        if line.startswith('msgctxt'): 
            flush(); mid=None; mstr=None; state='c'
        elif line.startswith('msgid '):
            if state!='c': flush()
            mid=eval(line[6:]); mstr=None; state='i'
        elif line.startswith('msgstr '):
            mstr=eval(line[7:]); state='s'
        elif line.startswith('"'):
            s=eval(line)
            if state=='i': mid+=s
            elif state=='s': mstr+=s
        elif not line.strip():
            flush(); mid=None; mstr=None; state=None
    flush()
    return d
d=parse(sys.argv[1])
def norm(s): return s.replace('&','').replace('…','...').strip()
nd={}
for k,v in d.items(): nd.setdefault(norm(k),[]).extend(v)
for q in sys.argv[2:]:
    r=nd.get(norm(q))
    print(f"{q} => {sorted(set(r)) if r else None}")
