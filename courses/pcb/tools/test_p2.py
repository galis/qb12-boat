"""第 2 课自测：桌面深色 1280 / 手机浅色 400 / 减少动画。每个小部件点一遍、截图放 _shots/p2/。
用法：PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 tools/test_p2.py   （先 python3 build.py --only 2）"""
import os, sys
if os.path.isdir('/opt/pw-browsers'): os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH', '/opt/pw-browsers')  # 容器；本机用 playwright 默认位置
from playwright.sync_api import sync_playwright

D = os.path.abspath(os.path.dirname(os.path.abspath(__file__)) + '/..') + '/'
PAGE = sys.argv[sys.argv.index('--page') + 1] if '--page' in sys.argv else '_preview_p2.html'   # 整页：--page _preview.html
URL = 'file://' + D + PAGE
OUT = D + ('_shots/full/p2/' if '--page' in sys.argv else '_shots/p2/')
os.makedirs(OUT, exist_ok=True)
fails = []
SHOTS = '--noshots' not in sys.argv


def check(cond, msg):
    print(('  ok   ' if cond else '  FAIL ') + msg)
    if not cond:
        fails.append(msg)


def shot(pg, sel, name):
    if SHOTS:
        pg.locator(sel).first.scroll_into_view_if_needed()
        pg.wait_for_timeout(150)
        pg.locator(sel).first.screenshot(path=OUT + name + '.png')


def run(p, name, vw, vh, scheme, reduced=False):
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
    T = 200 if reduced else 900
    # ---- 2.1 ----
    pg.locator('#p2 .lhead').scroll_into_view_if_needed()
    for ref in ['R17', 'U3', 'D1', 'SW2']:
        pg.click(f'#p2-map-parts [data-ref="{ref}"]'); pg.wait_for_timeout(120)
        n_pins = pg.locator('#p2-map .p2-pin').count()
        n_links = pg.locator('#p2-map .p2-link').count()
        check(n_pins >= 2 and n_links >= 2, f'2.1 {ref}: {n_pins} 个脚、{n_links} 根连线')
        pg.locator('#p2-map .p2-pin').first.dispatch_event('click'); pg.wait_for_timeout(100)
        st = pg.locator('#p2-map-status').inner_text()
        check('→' in st, f'2.1 {ref} 点脚后状态行：{st[:50]}')
        shot(pg, '#p2 .p2-mapw', f'{name}_21_{ref}')
    st = pg.locator('#p2-map-status').inner_text()
    pg.click('#p2-map-parts [data-ref="D1"]'); pg.locator('#p2-map .p2-pin').first.dispatch_event('click')
    st = pg.locator('#p2-map-status').inner_text()
    check('2 号焊盘' in st and 'pad_map' in st, f'2.1 D1 1 脚 → 2 号焊盘（{st[:60]}）')
    # ---- 2.2 ----
    pg.locator('#p2-an-bv').scroll_into_view_if_needed(); pg.wait_for_timeout(500)
    for ref in ['U2', 'R17', 'J1']:
        pg.click(f'#p2-an-parts [data-ref="{ref}"]')
        for i in range(8):
            pg.click(f'#p2-an-steps [data-step="{i}"]'); pg.wait_for_timeout(T if i == 0 else 160)
            t = pg.locator('#p2-an-t').inner_text()
            check(len(t) > 2, f'2.2 {ref} 第 {i + 1} 层：{t}')
            if ref == 'U2' or i in (1, 2):
                shot(pg, '#p2 .p2-anw', f'{name}_22_{ref}_{i + 1}')
    k = pg.evaluate("(() => { const v = BoardViewer.get('p2-an-bv'); return v.base[2] / v.vb[2]; })()")
    check(k >= 4, f'2.2 放大倍数 ≥ 4（{k:.1f}）')
    pg.click('#p2-mods [data-mod="1"]'); pg.wait_for_timeout(T)
    check('U2' in pg.locator('#p2-an-t').inner_text() or '孔' in pg.locator('#p2-an-t').inner_text(), '2.2 点“脚本改的”第 2 条 → 切到 U2 孔')
    shot(pg, '#p2-mods', f'{name}_22_mods')
    # ---- 2.3 ----
    cards = pg.locator('#p2-gal-grid [data-fp]')
    check(cards.count() == 17, f'2.3 17 张卡片（{cards.count()}）')
    pg.locator('#p2-gal-bv').scroll_into_view_if_needed(); pg.wait_for_timeout(400)
    for i in range(cards.count()):
        cards.nth(i).click(); pg.wait_for_timeout(T if i in (0, 5, 16) else 220)
        fp = cards.nth(i).get_attribute('data-fp')
        ro = pg.locator('#p2-gal-ro').inner_text()
        check(fp in ro, f'2.3 卡片 {fp[:30]} 的读数')
        if i in (0, 4, 8, 11, 13, 14, 15, 16) or 'USB' in fp or 'WIRELM' in fp or 'TSSOP' in fp:
            shot(pg, '#p2 .p2-galw', f'{name}_23_{i:02d}')
    pg.click('#p2-gal-grid [data-fp="WIRELM-SMD_ESP32-S3-WROOM-1"]'); pg.wait_for_timeout(T)
    check(pg.locator('#p2-gal-zoom').is_visible(), '2.3 模组：显示“放大到 1 号焊盘”')
    pg.click('#p2-gal-zoom'); pg.wait_for_timeout(T)
    k = pg.evaluate("(() => { const v = BoardViewer.get('p2-gal-bv'); return v.base[2] / v.vb[2]; })()")
    check(k >= 4, f'2.3 模组放大到 1 号焊盘 ≥ 4 倍（{k:.1f}）')
    check(pg.evaluate("getComputedStyle(document.querySelector('#p2-gal-bv .g-pnum')).display") != 'none', '2.3 显示焊盘号')
    shot(pg, '#p2 .p2-galw', f'{name}_23_U1zoom')
    pg.click('#p2-gal-trk'); pg.wait_for_timeout(200)
    check(pg.evaluate("BoardViewer.get('p2-gal-bv').state().tracks") is True, '2.3 显示走线')
    # ---- 2.4 ----
    pg.locator('#p2 .p2-pw').scroll_into_view_if_needed()
    for v in ['0.65', '0.635', '0.6', '0.5', '0.8']:
        pg.click(f'#p2-p-presets [data-v="{v}"]'); pg.wait_for_timeout(80)
        st = pg.locator('#p2-p-status').inner_text()
        check(len(st) > 10, f'2.4 脚距 {v}：{st[:40]}')
        if v in ('0.65', '0.635', '0.5'):
            shot(pg, '#p2 .p2-pw', f'{name}_24_{v}')
    pg.click('#p2-p-ep'); pg.wait_for_timeout(80)
    check('PowerPAD' in pg.locator('#p2-p-status').inner_text(), '2.4 漏画散热焊盘的提示')
    shot(pg, '#p2 .p2-pw', f'{name}_24_noep')
    pg.click('#p2-p-ep')
    pg.fill('#p2-p-range', '0.7'); pg.dispatch_event('#p2-p-range', 'input'); pg.wait_for_timeout(60)
    check('0.7' in pg.locator('#p2-p-val').inner_text(), '2.4 滑块')
    shot(pg, '#p2-fails', f'{name}_24_fails')
    # ---- 2.5 ----
    pg.locator('#p2 .p2-rw').scroll_into_view_if_needed()
    for ref in ['D1', 'LED3', 'U5', 'U2']:
        pg.click(f'#p2-r-parts [data-ref="{ref}"]'); pg.wait_for_timeout(80)
        pg.click('#p2-r-angs [data-real]'); pg.wait_for_timeout(T + 300)
        st = pg.locator('#p2-r-s').inner_text()
        check('QB12 实际' in st, f'2.5 {ref} 转到实际角度')
        shot(pg, '#p2 .p2-rw', f'{name}_25_{ref}')
    pg.click('#p2-r-angs [data-a="90"]'); pg.wait_for_timeout(T + 300)
    shot(pg, '#p2 .p2-rw', f'{name}_25_U2_90')
    # ---- 2.6 ----
    pg.locator('#p2-lc-tbl').scroll_into_view_if_needed()
    rows = pg.locator('#p2-lc-tbl tbody tr')
    check(rows.count() == 25, f'2.6 BOM 25 行（{rows.count()}）')
    rows.nth(0).click(); pg.wait_for_timeout(300)
    check('U1' in pg.locator('#p2-lc-bv .bv-panel').inner_text(), '2.6 点第一行 → U1 信息卡')
    pg.click('#p2-lc-filt [data-f="扩展"]'); pg.wait_for_timeout(200)
    vis = pg.evaluate("[...document.querySelectorAll('#p2-lc-tbl tbody tr')].filter(t => !t.hidden).length")
    check(vis == 9, f'2.6 扩展库 9 行（{vis}）')
    shot(pg, '#p2 .p2-lcw', f'{name}_26_ext')
    pg.click('#p2-lc-filt [data-f="all"]')
    st = pg.locator('#p2-st-status').inner_text()
    check(st.startswith('22 / 51'), f'2.6 交付时 22 / 51（{st[:20]}）')
    shot(pg, '#p2 .p2-stw', f'{name}_26_stale_old')
    pg.click('#p2-st-when [data-w="new"]'); pg.wait_for_timeout(80)
    check('全部一致' in pg.locator('#p2-st-status').inner_text(), '2.6 修复后全部一致')
    shot(pg, '#p2 .p2-stw', f'{name}_26_stale_new')
    pg.click('#p2-st-when [data-w="old"]'); pg.click('#p2-st-show'); pg.wait_for_timeout(T)
    n = pg.evaluate("document.querySelectorAll('#p2-lc-bv .g-hl .box').length")
    check(n == 22, f'2.6 板上标出 22 个（{n}）')
    shot(pg, '#p2 .p2-lcw', f'{name}_26_stale_board')
    for o, want in [('none', 51), ('smd', 50), ('th', 48)]:
        pg.click(f'#p2-sw-opts [data-o="{o}"]'); pg.wait_for_timeout(60)
        n = pg.evaluate("document.querySelectorAll('#p2-sw-chips .p2-chip.ok').length")
        check(n == want, f'2.6 导出选项 {o}：剩 {n} 个（应为 {want}）')
        if o != 'none':
            shot(pg, '#p2 .p2-sww', f'{name}_26_sw_{o}')
    # ---- 2.7 ----
    for i in range(4):
        pg.click(f'#p2-k-tabs [data-k="{i}"]'); pg.wait_for_timeout(60)
        vis = pg.evaluate(f"!document.querySelector('#p2 .p2-kfigs [data-k=\"{i}\"]').hidden")
        check(vis, f'2.7 第 {i + 1} 个标签页显示对应截图')
        shot(pg, '#p2 .p2-kw', f'{name}_27_{i}')
    # ---- 2.8 ----
    for q in range(3):
        pg.locator('#p2 .quiz details').nth(q).locator('summary').click()
        pg.locator(f'#p2 [data-p2q="{q + 1}"]').click(); pg.wait_for_timeout(T)
    check(pg.evaluate("document.querySelectorAll('#p2-lc-bv .g-hl .box').length") == 22, '2.8 第 3 题标出 22 个')
    shot(pg, '#p2 .quiz', f'{name}_28_quiz')
    shot(pg, '#p2 .next', f'{name}_28_next')
    # ---- 全局 ----
    sw = pg.evaluate('document.documentElement.scrollWidth')
    check(sw <= vw, f'没有横向滚动（{sw} ≤ {vw}）')
    wide = pg.evaluate(f'''() => [...document.querySelectorAll('#p2 *')].filter(e => {{ const r = e.getBoundingClientRect(); return r.width && r.right > {vw} + 1 && !e.closest('.tbl,.wscroll,.p2-lctbl,.bv-stage'); }}).slice(0, 6).map(e => e.tagName + '.' + (e.className.baseVal ?? e.className) + '#' + e.id)''')
    check(not wide, f'#p2 里没有元素超出右边：{wide}')
    if SHOTS:
        pg.locator('#p2').screenshot(path=OUT + f'{name}_full.png')
    check(not errs, '没有控制台错误' + ('：' + ' | '.join(errs[:5]) if errs else ''))
    b.close()


with sync_playwright() as p:
    run(p, 'desk_dark', 1280, 900, 'dark')
    run(p, 'phone_light', 400, 860, 'light')
    run(p, 'rm_dark', 1000, 800, 'dark', reduced=True)
print('\n全部通过' if not fails else f'\n{len(fails)} 项失败：\n- ' + '\n- '.join(fails))
sys.exit(1 if fails else 0)
