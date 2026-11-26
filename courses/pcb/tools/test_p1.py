"""第 1 课自测：桌面深色 1280 / 手机浅色 400 / 减少动画。截图放 _shots/p1/（文件名带 p1_ 前缀）。
用法：PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 tools/test_p1.py [--quick]"""
import os, sys
if os.path.isdir('/opt/pw-browsers'): os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH', '/opt/pw-browsers')  # 容器；本机用 playwright 默认位置
from playwright.sync_api import sync_playwright

D = os.path.abspath(os.path.dirname(os.path.abspath(__file__)) + '/..') + '/'
PAGE = sys.argv[sys.argv.index('--page') + 1] if '--page' in sys.argv else '_preview_p1.html'   # 整页：--page _preview.html
URL = 'file://' + D + PAGE
OUT = D + ('_shots/full/p1/' if '--page' in sys.argv else '_shots/p1/')
os.makedirs(OUT, exist_ok=True)
QUICK = '--quick' in sys.argv
fails = []


def check(c, m):
    print(('  ok   ' if c else '  FAIL ') + m)
    if not c:
        fails.append(m)


def run(p, name, vw, vh, scheme, reduced=False, shots=True):
    print(f'== {name}')
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': vw, 'height': vh}, color_scheme=scheme, reduced_motion='reduce' if reduced else 'no-preference',
                        device_scale_factor=1, has_touch=vw < 500)
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    pg.on('console', lambda m: errs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.goto(URL)
    pg.wait_for_timeout(1200)
    shot = lambda sel, fn: pg.locator(sel).screenshot(path=OUT + f'p1_{name}_{fn}.png') if shots else None
    T = 120 if reduced else 900
    # 1.1
    pg.locator('#p1').scroll_into_view_if_needed()
    pg.locator('#p1 .p1-isow').scroll_into_view_if_needed(); pg.wait_for_timeout(300)
    check(pg.locator('#p1-iso .p1-slab').count() == 8, '8 层')
    shot('#p1 .p1-isow', 'iso_open')
    pg.locator('#p1-isochips [data-p1l="F.Mask"]').click(); pg.wait_for_timeout(300)
    check('阻焊' in pg.locator('#p1-il-t').inner_text(), '点 F.Mask 出卡片')
    shot('#p1 .p1-isow', 'iso_fmask')
    pg.locator('#p1 [data-p1col="kicad"]').click(); pg.wait_for_timeout(200)
    shot('#p1 .p1-isow', 'iso_kicad_fmask')
    pg.locator('#p1-isochips [data-p1l="Drill"]').click(); pg.wait_for_timeout(200)
    shot('#p1 .p1-isow', 'iso_kicad_drill')
    pg.locator('#p1 [data-p1col="real"]').click()
    pg.locator('#p1-isochips [data-p1l="Drill"]').click()
    pg.locator('#p1 [data-p1iso="shut"]').click(); pg.wait_for_timeout(T)
    shot('#p1 .p1-isow', 'iso_shut')
    pg.locator('#p1 [data-p1iso="open"]').click(); pg.wait_for_timeout(T)
    # 点 SVG 里的一层
    pt = pg.evaluate("""() => { const m = document.querySelector('#p1-iso .p1-slab[data-l="F.Cu"] .p1-m'); const s = document.getElementById('p1-iso');
        const p = s.createSVGPoint(); p.x = 30; p.y = 36.5; const q = p.matrixTransform(m.getScreenCTM()); return [q.x, q.y]; }""")
    pg.mouse.click(pt[0], pt[1]); pg.wait_for_timeout(200)
    t = pg.locator('#p1-il-t').inner_text()
    check('顶层铜' in t, f'点图里的 F.Cu（{t}）')
    shot('#p1-ltab', 'ltab')
    # 1.2
    pg.locator('#p1 .p1-thw').scroll_into_view_if_needed(); pg.wait_for_timeout(200)
    shot('#p1 .p1-thw', 'thick_sch')
    pg.locator('#p1 [data-p1th="real"]').click(); pg.wait_for_timeout(T)
    shot('#p1 .p1-thw', 'thick_real')
    check(pg.locator('#p1-thsvg .p1-magc').count() == 1, '真实比例有放大镜')
    pg.locator('#p1 .p1-two').scroll_into_view_if_needed(); pg.wait_for_timeout(2800 if not reduced else 100)
    shot('#p1 .p1-two', 'oz1_tg')
    pg.locator('#p1 [data-p1oz="2"]').click(); pg.wait_for_timeout(150)
    shot('#p1 .p1-two', 'oz2')
    check('0.16' in pg.locator('#p1-ozck').inner_text(), '2 oz 的检查')
    shot('#p1 .p1-thw ~ .two:not(.p1-two)', 'stackup_howto')
    # 1.3
    pg.locator('#p1-mkbv').scroll_into_view_if_needed(); pg.wait_for_timeout(500)
    for i in range(5):
        pg.locator(f'#p1-mkbtns [data-p1mk="{i}"]').click(); pg.wait_for_timeout(350)
        check(pg.locator('#p1-mk-t').inner_text().startswith('①②③④⑤'[i]), f'阻焊第 {i + 1} 步')
        shot('#p1-mkbtns >> xpath=..', f'mask{i + 1}')
    st = pg.evaluate("BoardViewer.get('p1-mkbv').state()")
    check(st['side'] == 'bottom' and st['mode'] == 'made', '第 5 步翻到底面成品')
    # 1.4
    pg.locator('#p1 .p1-fabw').scroll_into_view_if_needed(); pg.wait_for_timeout(500)
    n = pg.locator('#p1-fsteps [data-p1fs]').count()
    check(n == 11, f'11 道工序（{n}）')
    for i in range(n):
        pg.locator(f'#p1-fsteps [data-p1fs="{i}"]').click(); pg.wait_for_timeout(150 if reduced else 1100)
        check(pg.locator('#p1-f-t').inner_text().startswith(f'第 {i + 1} 步'), f'工序 {i + 1} 卡片')
        if shots and (not QUICK or i in (0, 3, 6, 10)):
            shot('#p1 .p1-fabw', f'fab{i + 1:02d}')
    fs = pg.evaluate("document.getElementById('p1-fbv').dataset.fs")
    check(fs == '10', f'查看器跟着工序（data-fs={fs}）')
    pg.locator('#p1 [data-p1fc="kicad"]').click(); pg.wait_for_timeout(200)
    st = pg.evaluate("BoardViewer.get('p1-fbv').state()")
    check(st['mode'] == 'layers' and 'F.SilkS' in st['layers'], 'KiCad 层模式')
    pg.locator('#p1-fsteps [data-p1fs="3"]').click(); pg.wait_for_timeout(300)
    shot('#p1 .p1-fabw', 'fab04_kicad')
    pg.locator('#p1 [data-p1fc="made"]').click()
    pg.locator('#p1-fsteps [data-p1fs="8"]').click(); pg.wait_for_timeout(300)
    pg.locator('#p1-f-f [data-p1ff="enig"]').click(); pg.wait_for_timeout(300)
    check(pg.locator('#p1-xsec .p1-xenig').count() >= 1 and pg.locator('#p1-xsec .p1-xhasl').count() == 0, '剖面换成沉金')
    shot('#p1 .p1-fabw', 'fab09_enig')
    pg.click('#p1-fplay'); pg.wait_for_timeout(500)
    check(pg.locator('#p1-fplay').inner_text().startswith('■'), '播放中')
    pg.click('#p1-fplay')
    # 1.5
    pg.locator('#p1-fnbv').scroll_into_view_if_needed(); pg.wait_for_timeout(500)
    shot('#p1-fnbv >> xpath=../..', 'fin_lf_green')
    pg.locator('#p1 [data-p1fin="enig"]').click(); pg.locator('#p1 [data-p1msk="black"]').click(); pg.wait_for_timeout(250)
    check('只列了喷锡' in pg.locator('#p1-fn-ck').inner_text(), '黑油 + 沉金提示')
    shot('#p1-fnbv >> xpath=../..', 'fin_enig_black')
    pg.locator('#p1 [data-p1msk="blue"]').click(); pg.locator('#p1 [data-p1fin="pb"]').click(); pg.wait_for_timeout(250)
    shot('#p1-fnbv >> xpath=../..', 'fin_pb_blue')
    shot('#p1-rec', 'rec')
    # 1.6
    for q in (1, 2, 3):
        pg.locator('#p1 .quiz details').nth(q - 1).locator('summary').click()
    shot('#p1 .quiz', 'quiz')
    pg.locator('#p1 [data-p1q="2"]').click(); pg.wait_for_timeout(T)
    check(pg.evaluate("document.querySelector('#p1 [data-p1th=\"real\"]').getAttribute('aria-pressed')") == 'true', '第 2 题按钮切到真实比例')
    pg.locator('#p1 [data-p1q="1"]').click(); pg.wait_for_timeout(T)
    check(pg.locator('#p1-mk-t').inner_text().startswith('②'), '第 1 题按钮到阻焊第 2 步')
    pg.locator('#p1 [data-p1q="3"]').click(); pg.wait_for_timeout(T)
    check(pg.locator('#p1-f-t').inner_text().startswith('第 2 步'), '第 3 题按钮到钻孔')
    sw = pg.evaluate('document.documentElement.scrollWidth')
    check(sw <= vw, f'没有横向滚动（{sw}）')
    wide = pg.evaluate(f'''() => [...document.querySelectorAll('#p1 *')].filter(e => {{ const r = e.getBoundingClientRect(); return e instanceof HTMLElement && r.width && r.right > {vw} + 1; }}).slice(0, 5).map(e => e.tagName + '.' + e.className + '#' + e.id)''')
    check(not wide, f'没有元素超出右边：{wide}')
    if shots:
        pg.locator('#p1').screenshot(path=OUT + f'p1_{name}_full.png')
    check(not errs, '没有控制台错误' + ('：' + ' | '.join(errs[:5]) if errs else ''))
    b.close()


with sync_playwright() as p:
    run(p, 'desk_dark', 1280, 900, 'dark')
    run(p, 'phone_light', 400, 860, 'light')
    run(p, 'rm_dark', 1000, 800, 'dark', reduced=True, shots=not QUICK)
print('\n全部通过' if not fails else f'\n{len(fails)} 项失败：\n- ' + '\n- '.join(fails))
sys.exit(1 if fails else 0)
