"""快速看查看器：在构建好的页面里临时插一个查看器，截几张图。"""
import sys, os
if os.path.isdir('/opt/pw-browsers'): os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH', '/opt/pw-browsers')  # 容器；本机用 playwright 默认位置
from playwright.sync_api import sync_playwright
D = os.path.dirname(os.path.abspath(__file__)) + '/../'
OUT = D + '_shots/'
os.makedirs(OUT, exist_ok=True)
scheme = sys.argv[1] if len(sys.argv) > 1 else 'dark'; vw = int(sys.argv[2]) if len(sys.argv) > 2 else 1280
with sync_playwright() as p:
    b = p.chromium.launch(); errs = []
    pg = b.new_page(viewport={"width": vw, "height": 1000}, color_scheme=scheme)
    pg.on("pageerror", lambda e: errs.append('PAGEERR ' + str(e)))
    pg.on("console", lambda m: errs.append('CONSOLE ' + m.type + ' ' + m.text) if m.type in ('error', 'warning') else None)
    pg.goto("file://" + D + "_preview.html"); pg.wait_for_timeout(500)
    pg.evaluate("""() => { const d=document.createElement('div'); d.id='tv'; document.querySelector('.wrap').prepend(d);
       window.TV = BoardViewer.create(d, {nets:true, lazy:false}); }""")
    pg.wait_for_timeout(400)
    pg.locator('#tv').screenshot(path=OUT + f'tv_{scheme}_layers.png')
    for name, js in [('made', "TV.show({mode:'made'})"), ('madeB', "TV.show({mode:'made', side:'bottom'})"),
                     ('film', "TV.show({mode:'film', side:'top', layers:['F.Cu']})"),
                     ('net', "TV.show({mode:'layers', layers:['F.Cu','B.Cu','Vias','Zones','F.SilkS','Edge.Cuts','Drill','Keepouts']}); TV.selectNet('VSYS')"),
                     ('zoom', "TV.select('U2'); TV.focus('U2',{animate:false})"),
                     ('w08', "TV.reset({animate:false}); TV.highlightWidth(0.8)")]:
        pg.evaluate(js); pg.wait_for_timeout(700)
        pg.locator('#tv').screenshot(path=OUT + f'tv_{scheme}_{name}.png')
    print('scrollW', pg.evaluate("document.documentElement.scrollWidth"), 'vw', vw)
    print('\n'.join(errs) or 'no errors')
    b.close()
