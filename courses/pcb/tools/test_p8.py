"""第 8 课自己的 Playwright 检查 + 截图（_shots/p8/）。
用法：PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 tools/test_p8.py [--quick]"""
import os, sys
if os.path.isdir('/opt/pw-browsers'): os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH', '/opt/pw-browsers')  # 容器；本机用 playwright 默认位置
from playwright.sync_api import sync_playwright

D = os.path.abspath(os.path.dirname(os.path.abspath(__file__)) + '/..') + '/'
PAGE = sys.argv[sys.argv.index('--page') + 1] if '--page' in sys.argv else '_preview_p8.html'   # 整页：--page _preview.html
URL = 'file://' + D + PAGE
OUT = D + ('_shots/full/p8/' if '--page' in sys.argv else '_shots/p8/')
os.makedirs(OUT, exist_ok=True)
QUICK = '--quick' in sys.argv
fails = []


def check(cond, msg):
    print(('  ok   ' if cond else '  FAIL ') + msg)
    if not cond:
        fails.append(msg)


def shot(pg, sel, name):
    try:
        pg.locator(sel).first.scroll_into_view_if_needed()
        pg.wait_for_timeout(250)
        pg.locator(sel).first.screenshot(path=OUT + 'p8_' + name + '.png')
    except Exception as e:
        print('  (shot failed)', name, e)


def run(p, name, vw, vh, scheme, reduced=False, shots=True):
    print(f'== {name} ({vw}px, {scheme}{", reduced" if reduced else ""})')
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': vw, 'height': vh}, color_scheme=scheme, reduced_motion='reduce' if reduced else 'no-preference',
                        device_scale_factor=1, has_touch=vw < 500)
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    pg.on('console', lambda m: errs.append(f'CONSOLE {m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.goto(URL)
    pg.wait_for_timeout(1200)
    pg.locator('#p8').scroll_into_view_if_needed()
    # ---- 8.1 下单 8 步 ----
    pills = pg.locator('#p8-o-rail .p8-pill')
    check(pills.count() == 8, f'8 个步骤（{pills.count()}）')
    for i in range(8):
        pills.nth(i).click(); pg.wait_for_timeout(120)
        t = pg.locator('#p8-o-title').inner_text()
        check(t.startswith(f'第 {i + 1} 步'), f'步骤 {i + 1} 标题 {t}')
        if shots and (not QUICK or i in (0, 7)):
            shot(pg, '#p8 .p8-orderbox', f'{name}_order{i + 1}')
    check(pg.locator('#p8-o-warn').is_hidden(), '最后一步没有 X2 警告')
    pills.nth(0).click(); pg.wait_for_timeout(100)
    check('X2' in pg.locator('#p8-o-warn').inner_text() and '10-19' in pg.locator('#p8-o-warn').inner_text(), '第 1 步有 X2 检查项')
    check(pg.locator('#p8-o-prev').is_disabled(), '第 1 步“上一步”不可点')
    # ---- 8.2 参数 ----
    pg.locator('#p8 [data-p8mask="black"]').click(); pg.wait_for_timeout(150)
    pg.locator('#p8 [data-p8fin="enig"]').click(); pg.wait_for_timeout(150)
    st = pg.evaluate("BoardViewer.get('p8-pbv').state()")
    check(st['mask'] == 'black' and st['finish'] == 'enig' and st['mode'] == 'made', f'参数查看器 黑油+沉金（{st["mask"]} {st["finish"]}）')
    check('warn' in pg.locator('#p8-par-status').get_attribute('class'), '黑油 + 沉金 → 警告')
    if shots:
        shot(pg, '#p8 .p8-parbox', f'{name}_par_black_enig')
    pg.locator('#p8 [data-p8side="bottom"]').click(); pg.wait_for_timeout(200)
    n = pg.evaluate("document.querySelectorAll('#p8-pbv .g-ann rect.bx').length")
    check(n == 1, f'底面框出编号位置（{n}）')
    if shots:
        shot(pg, '#p8 .p8-parbox', f'{name}_par_bottom')
    pg.locator('#p8 [data-p8mask="green"]').click(); pg.locator('#p8 [data-p8fin="hasl"]').click(); pg.locator('#p8 [data-p8side="top"]').click()
    pg.wait_for_timeout(100)
    check('good' in pg.locator('#p8-par-status').get_attribute('class'), '绿油 + 喷锡 → 可以')
    if shots:
        shot(pg, '#p8 .p8-ptbl', f'{name}_par_table')
    # ---- 8.3 ----
    for m in ('eco', 'std1', 'auto'):
        pg.locator(f'#p8 [data-p8pan="{m}"]').click(); pg.wait_for_timeout(100)
        if shots and (not QUICK or m == 'auto'):
            shot(pg, '#p8-s3 .two', f'{name}_pan_{m}')
    check(pg.evaluate("document.querySelectorAll('#p8-pan path.p8-pb').length") == 1 and pg.evaluate("document.querySelectorAll('#p8-pan rect.p8-rail').length") == 1, '嘉立创加工艺边：画了外框和 1 块对照板')
    if shots:
        shot(pg, '#p8 .p8-smttbl', f'{name}_smt_table')
    # ---- 8.4 BOM ----
    rows = pg.locator('#p8-bom-rows tr')
    check(rows.count() == 25, f'BOM 25 行（{rows.count()}）')
    pg.locator('#p8 [data-p8f="扩展"]').click(); pg.wait_for_timeout(300)
    vis = pg.evaluate("[...document.querySelectorAll('#p8-bom-rows tr')].filter(t => !t.hidden).length")
    check(vis == 9, f'扩展库 9 行（{vis}）')
    if shots:
        shot(pg, '#p8 .p8-bombox', f'{name}_bom_ext')
    pg.locator('#p8 [data-p8f="all"]').click(); pg.wait_for_timeout(200)
    pg.locator('#p8-bom-rows tr').nth(1).click(); pg.wait_for_timeout(700)
    check('U2' in pg.locator('#p8-bbv .bv-badge').inner_text(), 'BOM 点 U2 行 → 板上标出')
    if shots:
        shot(pg, '#p8 .p8-bombox', f'{name}_bom_u2')
        shot(pg, '#p8-s4 .two', f'{name}_bom_text')
    # ---- 8.5 小游戏 ----
    tiles = pg.locator('#p8-tiles .p8-tile')
    check(tiles.count() == 6, f'6 个格子（{tiles.count()}）')
    if shots:
        shot(pg, '#p8 .p8-gamebox', f'{name}_game_start')
    tiles.nth(0).click(); tiles.nth(3).click()
    pg.click('#p8-g-check'); pg.wait_for_timeout(200)
    check('找对 2 / 3' in pg.locator('#p8-g-status').inner_text(), f'核对：{pg.locator("#p8-g-status").inner_text()[:40]}')
    verd = pg.locator('#p8-tiles .p8-tile').nth(5).locator('.p8-tverd').inner_text()
    check('VBUS' in verd and 'GND' in verd, f'U5 判语：{verd}')
    if shots:
        shot(pg, '#p8 .p8-gamebox', f'{name}_game_checked')
    pg.click('#p8-g-new'); pg.wait_for_timeout(100)
    check(pg.evaluate("document.querySelectorAll('#p8-tiles .p8-tile').length") == 6, '再来一局')
    # ---- 8.6 ----
    pg.locator('#p8-qty').fill('20'); pg.wait_for_timeout(100)
    check('20' in pg.locator('#p8-qty-v').inner_text() and '4100' in pg.locator('#p8-cost-var').inner_text(), '滑块 20 块 → 焊盘 205×20')
    if shots:
        shot(pg, '#p8 .p8-costbox', f'{name}_cost')
        shot(pg, '#p8-s6 .two', f'{name}_timeline')
        shot(pg, '#p8 .p8-boxrow', f'{name}_pack')
    # ---- 8.7 ----
    pg.locator('#p8 .p8-probebox').scroll_into_view_if_needed(); pg.wait_for_timeout(500)
    for n_ in ('VBUS', 'VSYS', '3V3', 'BAT+'):
        pg.locator(f'#p8 [data-p8pr="{n_}"]').click(); pg.wait_for_timeout(250)
        m = pg.evaluate("document.querySelectorAll('#p8-tbv .g-ann circle.p8-pm').length")
        check(m == 2, f'{n_}：两个表笔标记（{m}）')
        if shots and (not QUICK or n_ == 'BAT+'):
            shot(pg, '#p8 .p8-probebox', f'{name}_probe_{n_.replace("+", "p")}')
    check('100 kΩ' in pg.locator('#p8-pr-calc').inner_text(), 'BAT+ 提到 R14 100 kΩ')
    pg.locator(f'#p8 [data-p8pr="VBUS"]').click(); pg.wait_for_timeout(200)
    check('9.5 kΩ' in pg.locator('#p8-pr-calc').inner_text(), 'VBUS 推算 ≈ 9.5 kΩ')
    boxes = pg.locator('#p8-clist input[type="checkbox"]')
    check(boxes.count() == 10, f'清单 10 项（{boxes.count()}）')
    boxes.nth(0).check(); boxes.nth(1).check(); pg.wait_for_timeout(100)
    check('2 / 10' in pg.locator('#p8-c-prog').inner_text(), '勾选进度 2 / 10')
    pg.reload(); pg.wait_for_timeout(1000)
    check('2 / 10' in pg.locator('#p8-c-prog').inner_text(), f'刷新后勾选还在（{pg.locator("#p8-c-prog").inner_text()}）')
    if shots:
        shot(pg, '#p8 .p8-checkbox', f'{name}_checklist')
    pg.click('#p8-c-reset'); pg.wait_for_timeout(100)
    check('0 / 10' in pg.locator('#p8-c-prog').inner_text(), '清空勾选')
    pg.locator('#p8-clist [data-p8cp="3V3"]').click(); pg.wait_for_timeout(700)
    check('3V3' in pg.locator('#p8-pr-title').inner_text(), '清单按钮 → 表笔 3V3')
    for k in ('short', 'missing', 'rot', 'volt'):
        pg.locator(f'#p8 [data-p8fix="{k}"]').click(); pg.wait_for_timeout(80)
        if shots and (not QUICK or k == 'short'):
            shot(pg, '#p8 .p8-fixbox', f'{name}_fix_{k}')
    # ---- 8.8 ----
    for i in range(3):
        pg.locator('#p8 .quiz details').nth(i).locator('summary').click()
    pg.wait_for_timeout(150)
    q2 = pg.locator('#p8-q2').inner_text()
    check('GND' in q2 and 'CHRG' in q2, f'q2 计算出错位：{q2[:60]}')
    if shots:
        shot(pg, '#p8 .quiz', f'{name}_quiz')
        shot(pg, '#p8 .p8-recap', f'{name}_recap')
    pg.locator('#p8 [data-p8q="2"]').click(); pg.wait_for_timeout(800)
    check(pg.evaluate("[...document.querySelectorAll('#p8-tiles .p8-tile')].length") == 6, 'q2 按钮开新一局')
    pg.locator('#p8 [data-p8q="3"]').click(); pg.wait_for_timeout(800)
    check('BAT+' in pg.locator('#p8-pr-title').inner_text(), 'q3 按钮 → BAT+')
    sw = pg.evaluate('document.documentElement.scrollWidth')
    check(sw <= vw, f'没有横向滚动（{sw} ≤ {vw}）')
    wide = pg.evaluate(f'''() => [...document.querySelectorAll('#p8 *')].filter(e => {{ const r = e.getBoundingClientRect(); return r.right > {vw} + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('.tbl, .wscroll, .p8-m-pre, .bv-stage'); }}).slice(0, 6).map(e => e.tagName + '.' + e.className.baseVal + e.className + '#' + e.id)''')
    check(not wide, f'第 8 课没有元素超出右边：{wide}')
    if shots:
        pg.locator('#p8').screenshot(path=OUT + f'p8_{name}_full.png')
    check(not errs, '没有控制台错误' + ('：' + ' | '.join(errs[:5]) if errs else ''))
    b.close()


with sync_playwright() as p:
    run(p, 'desk_dark', 1280, 900, 'dark')
    run(p, 'phone_light', 400, 860, 'light')
    run(p, 'rm_dark', 1000, 800, 'dark', reduced=True, shots=not QUICK)
print('\n全部通过' if not fails else f'\n{len(fails)} 项失败：\n- ' + '\n- '.join(fails))
sys.exit(1 if fails else 0)
