import sys,re
from html.parser import HTMLParser
class P(HTMLParser):
    def __init__(s):
        super().__init__(); s.rows=[]; s.row=None; s.cell=None; s.h=None; s.cur_h=''
    def handle_starttag(s,t,a):
        if t=='tr': s.row=[]
        elif t in('td','th') and s.row is not None: s.cell=[]
        elif t in('h2','h3','h4'): s.h=[]
    def handle_endtag(s,t):
        if t in('td','th') and s.cell is not None and s.row is not None:
            s.row.append(re.sub(r'\s+',' ',''.join(s.cell)).strip()); s.cell=None
        elif t=='tr' and s.row is not None:
            s.rows.append((s.cur_h,s.row)); s.row=None
        elif t in('h2','h3','h4') and s.h is not None:
            s.cur_h=re.sub(r'\s+',' ',''.join(s.h)).strip(); s.h=None
    def handle_data(s,d):
        if s.cell is not None: s.cell.append(d)
        if s.h is not None: s.h.append(d)
p=P(); p.feed(open(sys.argv[1],encoding='utf-8',errors='replace').read())
for h,r in p.rows:
    print(h,'\t','\t'.join(r))
