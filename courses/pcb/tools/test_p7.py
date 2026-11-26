"""第 7 课自测：桌面深色 1280 / 手机浅色 400 / 减少动画。截图放 _shots/p7/。
用法：PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 tools/test_p7.py [--quick]"""
import os, sys
if os.path.isdir('/opt/pw-browsers'): os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH', '/opt/pw-browsers')  # 容器；本机用 playwright 默认位置
from playwright.sync_api import sync_playwright

D = os.path.abspath(os.path.dirname(os.path.abspath(__file__)) + '/..') + '/'
PAGE = sys.argv[sys.argv.index('--page') + 1] if '--page' in sys.argv else '_preview_p7.html'   # 整页：--page _preview.html
URL = 'file://' + D + PAGE
OUT = D + ('_shots/full/p7/' if '--page' in sys.argv else '_shots/p7/')
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
    pg.on('console', lambda m: errs.append(f'CONSOLE {m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.goto(URL)
    pg.wait_for_timeout(1200)
    pg.evaluate("document.querySelector('#p7').scrollIntoView()")
    pg.wait_for_timeout(400)
    sec = lambda i: pg.locator('#p7 > .sec').nth(i)

    def shot(loc, fn):
        if shots:
            loc.scroll_into_view_if_needed(); pg.wait_for_timeout(250 if reduced else 500)
            loc.screenshot(path=OUT + f'{name}_{fn}.png')

    # 7.1
    shot(sec(0), '71_initial')
    pg.click('#p7-fl-files [data-f="PTH"]'); pg.wait_for_timeout(200)
    on = pg.evaluate("[...document.querySelectorAll('#p7-fl-st .p7-st.on')].map(e => e.dataset.s)")
    check(on == ['cam', 'drill', 'plate'], f'PTH → 工序 {on}')
    shot(sec(0), '71_pth')
    pg.click('#p7-fl-st [data-s="pnp"]'); pg.wait_for_timeout(200)
    used = pg.evaluate("[...document.querySelectorAll('#p7-fl-files .used')].map(e => e.dataset.f)")
    check(sorted(used) == ['BOM', 'CPL'], f'贴片机 → 文件 {used}')
    pg.click('#p7-fl-play'); pg.wait_for_timeout(2000)
    check('2 /' in pg.locator('#p7-fl-lab').inner_text() or '1 /' in pg.locator('#p7-fl-lab').inner_text(), '按工序播放')
    pg.click('#p7-fl-play')
    # 7.2
    sec(1).scroll_into_view_if_needed(); pg.wait_for_timeout(700)
    st = pg.evaluate("BoardViewer.get('p7-gbv').state()")
    check(st['mode'] == 'film' and st['layers'] == ['F.Cu'], f'Gerber 查看器初始 F.Cu 胶片 {st["mode"]} {st["layers"]}')
    shot(sec(1).locator('.p7-gbbox'), '72_fcu')
    for k in ([] if QUICK else ['B_Cu', 'F_Mask', 'B_Mask', 'F_Silkscreen', 'B_Silkscreen', 'F_Paste', 'B_Paste', 'Edge_Cuts', 'PTH', 'NPTH']):
        pg.click(f'#p7-gb-list [data-g="{k}"]'); pg.wait_for_timeout(150)
        shot(sec(1).locator('.p7-gbbox'), f'72_{k}')
    pg.click('#p7-gb-list [data-g="NPTH"]'); pg.wait_for_timeout(150)
    n = pg.evaluate("document.querySelectorAll('#p7-gbv .g-ann .p7-ring').length")
    check(n == 4, f'NPTH 胶片 4 个圈（{n}）')
    shot(sec(1).locator('.two').first, '72_code')
    shot(sec(1).locator('.two').nth(1), '72_howto')
    # 7.3
    sec(2).scroll_into_view_if_needed(); pg.wait_for_timeout(700)
    shot(sec(2).locator('.widget'), '73_initial')
    rows = pg.locator('#p7-dr-tbl tbody tr')
    check(rows.count() == 6, f'钻头表 6 行（{rows.count()}）')
    for i in range(rows.count()):
        rows.nth(i).click(); pg.wait_for_timeout(500)
        n = pg.evaluate("document.querySelectorAll('#p7-drv .g-ann .p7-ring').length")
        want = pg.evaluate(f"(() => {{ const t = [...QB.board.fab.pth, ...QB.board.fab.npth][{i}]; return t.n; }})()")
        check(n == want, f'钻头第 {i + 1} 行：{n} 个圈 = {want}')
        if i in (3, 5):
            shot(sec(2).locator('.widget'), f'73_row{i + 1}')
    pg.click('#p7-dr-cu'); pg.wait_for_timeout(300)
    check(pg.evaluate("BoardViewer.get('p7-drv').state().mode") == 'layers', '叠上铜层')
    shot(sec(2).locator('.widget'), '73_cu')
    pg.locator('#p7-npth .p7-cl').nth(2).click(); pg.wait_for_timeout(700)
    t = pg.locator('#p7-npth-read').inner_text()
    check('SW1' in t and '22.1' in t, f'NPTH 第 3 个坐标 → SW1 (22.1)：{t[:50]}')
    shot(sec(2).locator('.two').first, '73_npth')
    # 7.4
    sec(3).scroll_into_view_if_needed(); pg.wait_for_timeout(700)
    shot(sec(3).locator('.widget'), '74_bom')
    chk = pg.locator('#p7-tb-chk .bad').count()
    check(chk == 0, f'BOM/CPL 核对全 ✓（{chk} 个 ✗）')
    pg.locator('#p7-tb-t tbody tr').nth(16).click(); pg.wait_for_timeout(300)
    pg.click('#p7-tb-cpl'); pg.wait_for_timeout(300)
    n = pg.locator('#p7-tb-t tbody tr').count()
    check(n == 5, f'BOM 第 17 行（10kΩ ×5）→ CPL 只剩 5 行（{n}）')
    shot(sec(3).locator('.widget'), '74_cpl_filtered')
    pg.click('#p7-tb-all'); pg.wait_for_timeout(200)
    check(pg.locator('#p7-tb-t tbody tr').count() == 51, 'CPL 全部 51 行')
    pg.locator('#p7-tb-t tbody tr').nth(46).click(); pg.wait_for_timeout(500)
    check('U1' in pg.evaluate("document.querySelector('#p7-bmv .bv-badge').textContent"), 'CPL 点 U1 → 查看器标出')
    shot(sec(3).locator('.widget'), '74_cpl_u1')
    shot(sec(3).locator('.howto'), '74_howto')
    # 7.5
    sec(4).scroll_into_view_if_needed(); pg.wait_for_timeout(700)
    shot(sec(4).locator('.widget').first, '75_u1')
    pg.click('#p7-co-picks [data-copick="J1"]'); pg.wait_for_timeout(500)
    m = pg.locator('#p7-co-math').inner_text()
    check('4.400' in m and '一字不差' in m, f'J1 坐标 4.400 且和文件一致')
    shot(sec(4).locator('.widget').first, '75_j1')
    pg.click('#p7-co-abs'); pg.wait_for_timeout(300)
    m = pg.locator('#p7-co-math').inner_text()
    check('-133.600' in m and '126.500' in m, f'绝对原点 J1 (126.5, −133.6)')
    shot(sec(4).locator('.widget').first, '75_j1_abs')
    pg.click('#p7-co-aux')
    # 在板上点一个元件
    pg.evaluate("BoardViewer.get('p7-cov').reset({animate:false})"); pg.wait_for_timeout(200)
    pg.evaluate("BoardViewer.get('p7-cov').stage.scrollIntoView({block:'center'})"); pg.wait_for_timeout(300)
    pt = pg.evaluate("""() => { const v = BoardViewer.get('p7-cov'); const f = QB.fp('R9'); const r = v.stage.getBoundingClientRect();
        return [r.left + (f.x - v.vb[0]) / v.vb[2] * r.width, r.top + (f.y - v.vb[1]) / v.vb[3] * r.height]; }""")
    pg.mouse.click(pt[0], pt[1]); pg.wait_for_timeout(400)
    check('R9' in pg.locator('#p7-co-title').inner_text(), f'点板上 R9 → 卡片 {pg.locator("#p7-co-title").inner_text()}')
    # 旋转
    rb = sec(4).locator('.p7-rotbox')
    rb.scroll_into_view_if_needed()
    pg.click('#p7-rot-picks [data-rot="U2"]'); pg.wait_for_timeout(300 if reduced else 700)
    shot(rb, '75_rot_mid')
    pg.wait_for_timeout(100 if reduced else 900)
    shot(rb, '75_rot_u2')
    pg.click('#p7-rot-jlc'); pg.wait_for_timeout(200)
    check(pg.locator('#p7-rot .p7-rghost').count() == 1, '示意虚线出现')
    shot(rb, '75_rot_jlc')
    for r in ([] if QUICK else ['J2', 'D1', 'J1', 'U1']):
        pg.click(f'#p7-rot-picks [data-rot="{r}"]'); pg.wait_for_timeout(200 if reduced else 1500)
        shot(rb, f'75_rot_{r}')
    pg.click('#p7-rot-jlc')
    shot(sec(4).locator('.two'), '75_howto')
    # 7.6
    sec(5).scroll_into_view_if_needed(); pg.wait_for_timeout(400)
    shot(sec(5).locator('#p7-sh'), '76_script')
    pg.locator('#p7-sh .p7-k[data-k="sep"]').click(); pg.wait_for_timeout(200)
    check(pg.locator('#p7-set .p7-set.on').count() == 1, '点脚本参数 → 一张卡片亮')
    shot(sec(5).locator('#p7-set'), '76_cards')
    shot(sec(5).locator('.tip'), '76_tip')
    shot(sec(5).locator('.two'), '76_ft')
    # 7.7
    sec(6).scroll_into_view_if_needed(); pg.wait_for_timeout(700)
    for i in range(6):
        pg.locator('#p7-ck li').nth(i).click(); pg.wait_for_timeout(300 if reduced else 800)
        shot(sec(6).locator('.widget'), f'77_ck{i + 1}')
    check('都看过了' in pg.locator('#p7-ck-st').inner_text(), '六项都看过')
    shot(sec(6).locator('.two'), '77_howto')
    # 7.8
    sec(7).scroll_into_view_if_needed()
    for i in range(3):
        pg.locator('#p7 .quiz details').nth(i).locator('summary').click()
    shot(sec(7), '78_quiz')
    pg.locator('#p7 [data-p7q="1"]').click(); pg.wait_for_timeout(900)
    check(pg.evaluate("document.querySelectorAll('#p7-drv .g-ann .p7-ring').length") == 4, '自测 1 → 4 个 NPTH 圈')
    pg.locator('#p7 [data-p7q="2"]').click(); pg.wait_for_timeout(900)
    check('J1' in pg.locator('#p7-co-title').inner_text(), '自测 2 → J1')
    pg.locator('#p7 [data-p7q="3"]').click(); pg.wait_for_timeout(1800)
    check(pg.evaluate("document.querySelector('#p7-rot-picks [data-rot=\"U2\"]').getAttribute('aria-pressed')") == 'true', '自测 3 → U2')
    shot(sec(8), '79_next')
    sw = pg.evaluate('document.documentElement.scrollWidth')
    check(sw <= vw, f'没有横向滚动（{sw}）')
    wide = pg.evaluate(f'''() => [...document.querySelectorAll('#p7 *')].filter(e => {{ if (e.closest('.bv-stage')) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.right > {vw} + 1; }}).slice(0, 6).map(e => e.tagName + '.' + (e.className.baseVal ?? e.className) + '#' + e.id)''')
    check(not wide, f'第 7 课没有元素超出右边：{wide}')
    if shots and not QUICK:
        pg.evaluate("document.querySelector('#p7').scrollIntoView()")
        pg.locator('#p7').screenshot(path=OUT + f'{name}_full.png')
    check(not errs, '没有控制台错误' + ('：' + ' | '.join(errs[:5]) if errs else ''))
    b.close()


with sync_playwright() as p:
    run(p, 'desk_dark', 1280, 900, 'dark')
    run(p, 'phone_light', 400, 860, 'light')
    run(p, 'rm_dark', 1000, 800, 'dark', reduced=True, shots=False)
print('\n全部通过' if not fails else f'\n{len(fails)} 项失败：\n- ' + '\n- '.join(fails))
sys.exit(1 if fails else 0)
