"""第 6 课自己的 Playwright 检查 + 截图（_shots/p6/）。
用法：PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 tools/test_p6.py [--page _preview_p6.html] [--noshots]"""
import os, sys
if os.path.isdir('/opt/pw-browsers'): os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH', '/opt/pw-browsers')  # 容器；本机用 playwright 默认位置
from playwright.sync_api import sync_playwright

D = os.path.abspath(os.path.dirname(os.path.abspath(__file__)) + '/..') + '/'
PAGE = sys.argv[sys.argv.index('--page') + 1] if '--page' in sys.argv else '_preview_p6.html'
SHOTS = '--noshots' not in sys.argv
OUT = D + ('_shots/full/p6/' if '--page' in sys.argv else '_shots/p6/')   # --page（整页测试）时截图另放
os.makedirs(OUT, exist_ok=True)
URL = 'file://' + D + PAGE
fails = []


def check(cond, msg):
    print(('  ok   ' if cond else '  FAIL ') + msg)
    if not cond:
        fails.append(msg)


def shot(pg, sel, name):
    if SHOTS:
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
    pg.locator('#p6').scroll_into_view_if_needed()
    pg.wait_for_timeout(300)
    sw = pg.evaluate('document.documentElement.scrollWidth')
    check(sw <= vw, f'没有横向滚动（{sw} ≤ {vw}）')
    wide = pg.evaluate(f'''() => [...document.querySelectorAll('#p6 *')].filter(e => {{ const r = e.getBoundingClientRect(); return r.width && r.right > {vw} + 1 && !e.closest('.p6-items,.tbl,.code,.wscroll'); }}).slice(0, 6).map(e => e.tagName + '.' + e.className + '#' + e.id)''')
    check(not wide, f'第 6 课没有元素超出右边：{wide}')
    # ---- 6.1 ----
    rows = pg.locator('#p6-mg-rows .p6-mg-row')
    check(rows.count() == 8, f'余量图 8 行（{rows.count()}）')
    pg.locator('#p6 .p6-mg').scroll_into_view_if_needed(); pg.wait_for_timeout(700)
    shot(pg, '#p6 .p6-mg', f'{name}_61_track')
    for k in ['clr', 'h2h', 'edge', 'text']:
        pg.locator(f'#p6-mg-rows [data-k="{k}"]').click(); pg.wait_for_timeout(250 if reduced else 800)
        shot(pg, '#p6 .p6-mg', f'{name}_61_{k}')
    txt = pg.locator('#p6-mg-text').inner_text()
    check('0.8' in txt, '字高一行提到 0.8 mm')
    pg.locator('#p6-mg-rows [data-k="clr"]').click(); pg.wait_for_timeout(200)
    t = pg.locator('#p6-mg-facts').inner_text()
    check('0.15' in t and 'J1' in t, f'间距一行：J1 0.15（{t[:60]!r}）')
    pg.locator('#p6-mg-btns [data-b="1"]').click(); pg.wait_for_timeout(250 if reduced else 800)
    shot(pg, '#p6 .p6-mg-card', f'{name}_61_clr_tracks')
    badge = pg.locator('#p6-mg-bv .bv-badge').inner_text()
    check('0.18' in badge, f'最近两根线 0.18 mm（{badge}）')
    pg.locator('#p6-mg-kd').click(); pg.wait_for_timeout(150)
    check(pg.evaluate("getComputedStyle(document.querySelector('#p6 .p6-mg-m.kd')).display") == 'block', 'KiCad 默认值开关')
    shot(pg, '#p6 .p6-mg-chart', f'{name}_61_kd')
    # ---- 6.2 ----
    tabs = pg.locator('#p6-toy-tabs [data-t]')
    check(tabs.count() == 8, f'小实验 8 项（{tabs.count()}）')
    pg.locator('#p6 .p6-toy').scroll_into_view_if_needed()
    expect = {0: '间距违规', 1: '走线宽度', 2: '孔环宽度', 3: '钻孔太靠近', 4: '边缘间距', 5: '连接缺失', 6: '外框重叠', 7: '丝印'}
    for i in range(8):
        tabs.nth(i).click(); pg.wait_for_timeout(120)
        ok0 = '没有违规' in pg.locator('#p6-toy-list').inner_text()
        if i == 1:
            check(True, '线宽初始 0.2')
        shot(pg, '#p6 .p6-toy', f'{name}_62_{i}_ok')
        # 把滑块拉到会违规的一头
        r = pg.locator('#p6-toy-range')
        mn, mx = float(r.get_attribute('min')), float(r.get_attribute('max'))
        bad = {0: 0.1, 1: 0.1, 2: 0.4, 3: 0.45, 4: 0.15, 5: 1.2, 6: 2.6, 7: 0.1}[i]
        pg.evaluate(f"(() => {{ const r = document.getElementById('p6-toy-range'); r.value = {bad}; r.dispatchEvent(new Event('input')); }})()")
        pg.wait_for_timeout(80)
        lst = pg.locator('#p6-toy-list').inner_text()
        check(expect[i] in lst, f'第 {i + 1} 项违规时出现 “{expect[i]}”（初始无违规 {ok0}）')
        shot(pg, '#p6 .p6-toy', f'{name}_62_{i}_bad')
    # 拖动（鼠标）：第 1 项，把下面那根线往上拖
    tabs.nth(0).click(); pg.wait_for_timeout(100)
    if vw > 500:
        box = pg.locator('#p6-toy-svg').bounding_box()
        k = box['width'] / 520
        x, y = box['x'] + 260 * k, box['y'] + (40 + 52 + 0.3 * 260 + 26) * k
        pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x, y - 60 * k, steps=6); pg.mouse.up()
        v = float(pg.locator('#p6-toy-range').input_value())
        check(v < 0.12, f'拖动把间距拖小（{v}）')
    # ---- 6.3 ----
    pg.locator('#p6 .p6-rep').scroll_into_view_if_needed(); pg.wait_for_timeout(400)
    s = pg.locator('#p6-rep-sum').inner_text()
    check('143' in s, f'报告总数 143 警告（{s!r}）')  # board.json：KiCad 10.0.6 重抽（8.0.9 时是 180）
    shot(pg, '#p6 .p6-rep', f'{name}_63_start')
    pg.locator('#p6-items [data-i]').nth(3).click(); pg.wait_for_timeout(250 if reduced else 800)
    shot(pg, '#p6 .p6-rep', f'{name}_63_item')
    if SHOTS:   # 视口截图：手机上查看器是 sticky 的，整块截图看不出真实效果
        pg.locator('#p6-items [data-i]').nth(3).scroll_into_view_if_needed(); pg.wait_for_timeout(300)
        pg.screenshot(path=OUT + f'{name}_63_viewport.png')
    check(pg.evaluate("document.querySelectorAll('#p6-rep-bv .g-ann .p6-ring').length") == 1, '选中一条：板上一个大圈')
    # 极性那一条（背面）
    pol = pg.locator('#p6-items .p6-it.pol')
    check(pol.count() == 1, '列表里能找到背面“+”那一条')
    pol.click(); pg.wait_for_timeout(250 if reduced else 800)
    st = pg.evaluate("BoardViewer.get('p6-rep-bv').state()")
    check(st['side'] == 'bottom', f'背面的条目把查看器翻到底面（{st["side"]}）')
    shot(pg, '#p6 .p6-rep', f'{name}_63_pol')
    # 排除
    pg.locator('#p6-ex').click(); pg.wait_for_timeout(100)
    s = pg.locator('#p6-rep-sum').inner_text()
    check('142' in s, f'排除一条后 142 警告（{s!r}）')
    pg.locator('#p6-ex').click(); pg.wait_for_timeout(100)
    # 改严重级别
    pg.select_option('#p6-types select[data-sev="lib_footprint_issues"]', 'error'); pg.wait_for_timeout(100)
    s = pg.locator('#p6-rep-sum').inner_text()
    check('51' in s and '92' in s, f'库那类改成错误：51 错误 92 警告（{s!r}）')
    pg.select_option('#p6-types select[data-sev="silk_overlap"]', 'ignore'); pg.wait_for_timeout(100)
    tabs_t = pg.locator('#p6-rep-tabs').inner_text()
    check('忽略的测试 (8)' in tabs_t, f'忽略一类后“忽略的测试”+1（{tabs_t!r}）')
    pg.select_option('#p6-types select[data-sev="silk_overlap"]', 'warning')
    pg.select_option('#p6-types select[data-sev="lib_footprint_issues"]', 'warning')
    for ty in ['silk_over_copper', 'lib_footprint_issues', 'silk_edge_clearance']:
        pg.locator(f'#p6-types [data-ty="{ty}"]').click(); pg.wait_for_timeout(120)
        pg.locator('#p6-items [data-i]').first.click(); pg.wait_for_timeout(250 if reduced else 800)
        shot(pg, '#p6 .p6-rep', f'{name}_63_{ty}')
    # ---- 6.4 ----
    pg.locator('#p6 .p6-vd').scroll_into_view_if_needed(); pg.wait_for_timeout(200)
    shot(pg, '#p6 .p6-vd', f'{name}_64_out')
    pg.locator('#p6 [data-p6run="pkg"]').click(); pg.wait_for_timeout(600)
    leg = pg.locator('#p6-vleg').inner_text()
    check('95' in leg, f'交付包 95 条（{leg!r}）')  # KiCad 10.0.6（8.0.9 时 132）
    shot(pg, '#p6 .p6-vd', f'{name}_64_pkg')
    shot(pg, '#p6 .p6-nocheck', f'{name}_64_parity')
    # ---- 6.5 ----
    pg.locator('#p6 .p6-3d').scroll_into_view_if_needed(); pg.wait_for_timeout(400)
    checks = pg.locator('#p6-3d-checks [data-c]')
    check(checks.count() == 7, f'3D 检查 7 项（{checks.count()}）')
    for i in range(7):
        checks.nth(i).click(); pg.wait_for_timeout(150)
        shot(pg, '#p6 .p6-3d', f'{name}_65_{i}_top')
        if i in (0, 3, 6):
            pg.locator('#p6 [data-p6view="low"]').click(); pg.wait_for_timeout(150)
            shot(pg, '#p6 .p6-3d', f'{name}_65_{i}_low')
            pg.locator('#p6 [data-p6view="top"]').click()
    pg.evaluate("(() => { const r = document.getElementById('p6-ht-range'); r.value = 4; r.dispatchEvent(new Event('input')); })()")
    o = pg.locator('#p6-ht-out').inner_text()
    check('J2' in o and '放不下' in o, f'4 mm 时 J2 放不下（{o[:40]!r}）')
    shot(pg, '#p6 .p6-ht', f'{name}_65_ht4')
    pg.evaluate("(() => { const r = document.getElementById('p6-ht-range'); r.value = 7; r.dispatchEvent(new Event('input')); })()")
    check('放得下' in pg.locator('#p6-ht-out').inner_text(), '7 mm 时都放得下')
    shot(pg, '#p6 .p6-ht', f'{name}_65_ht7')
    # ---- 6.6 ----
    pg.locator('#p6 .p6-ck').scroll_into_view_if_needed()
    boxes = pg.locator('#p6-ck-list input')
    check(boxes.count() == 12, f'清单 12 项（{boxes.count()}）')
    boxes.nth(0).check(); boxes.nth(3).check(); pg.wait_for_timeout(100)
    check('2 / 12' in pg.locator('#p6-ck-n').inner_text(), '勾两项后计数')
    shot(pg, '#p6 .p6-ck', f'{name}_66')
    pg.reload(); pg.wait_for_timeout(900)
    check('2 / 12' in pg.locator('#p6-ck-n').inner_text(), '刷新后勾选还在（localStorage）')
    pg.locator('#p6-ck-reset').click()
    # ---- 6.7 ----
    for i in range(3):
        pg.locator('#p6 .quiz details').nth(i).locator('summary').click()
    pg.wait_for_timeout(100)
    shot(pg, '#p6 .quiz', f'{name}_67_quiz')
    pg.locator('#p6 [data-p6q="3"]').click(); pg.wait_for_timeout(250 if reduced else 1800)
    check('J1' in pg.locator('#p6-mg-bv .bv-badge').inner_text(), '第 3 题按钮：6.1 查看器标出 J1')
    pg.locator('#p6 [data-p6q="2"]').click(); pg.wait_for_timeout(250 if reduced else 900)
    check('在库中找不到封装' in pg.locator('#p6-rep-card h4').inner_text(), '第 2 题按钮：报告切到库那一类')
    if SHOTS:
        pg.locator('#p6 .next').screenshot(path=OUT + f'{name}_next.png')
    check(not errs, f'没有控制台错误：{errs[:4]}')
    b.close()


with sync_playwright() as p:
    run(p, 'desk_dark', 1280, 900, 'dark')
    run(p, 'phone_light', 400, 860, 'light')
    run(p, 'reduced', 1280, 900, 'dark', reduced=True)
print('FAILS:', len(fails))
for f in fails:
    print('  -', f)
sys.exit(1 if fails else 0)
