"""第 3 课自测：桌面深色 1280 / 手机浅色 400 / 减少动画；每个小部件的每个状态截图到 _shots/p3/。
用法：PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 tools/test_p3.py [--quick]"""
import os, sys, math, json
if os.path.isdir('/opt/pw-browsers'): os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH', '/opt/pw-browsers')  # 容器；本机用 playwright 默认位置
from playwright.sync_api import sync_playwright

D = os.path.abspath(os.path.dirname(os.path.abspath(__file__)) + '/..') + '/'
PAGE = sys.argv[sys.argv.index('--page') + 1] if '--page' in sys.argv else '_preview_p3.html'   # 整页：--page _preview.html
URL = 'file://' + D + PAGE
OUT = D + ('_shots/full/p3/' if '--page' in sys.argv else '_shots/p3/')
os.makedirs(OUT, exist_ok=True)
QUICK = '--quick' in sys.argv
fails = []


def check(cond, msg):
    print(('  ok   ' if cond else '  FAIL ') + msg)
    if not cond:
        fails.append(msg)


def run(p, name, vw, vh, scheme, reduced=False, shots=True):
    print(f'== {name}')
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': vw, 'height': vh}, color_scheme=scheme, reduced_motion='reduce' if reduced else 'no-preference',
                        device_scale_factor=1 if vw > 500 else 2, has_touch=vw < 500)
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    pg.on('console', lambda m: errs.append(f'CONSOLE {m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.goto(URL)
    pg.wait_for_timeout(800)
    T = (lambda ms: pg.wait_for_timeout(120 if reduced else ms))
    shot = (lambda sel, fn: pg.locator(sel).screenshot(path=OUT + f'{name}_{fn}.png') if shots else None)

    # 数字一致性：自己算的最终飞线总长 = board.json 里 ratsnest 的总长
    r = pg.evaluate('''() => { const R = QB.board.ratsnest; return R.reduce((s, r) => s + Math.hypot(r[3]-r[1], r[4]-r[2]), 0); }''')
    txt = pg.locator('#p3-st-f').inner_text()
    check('个' in txt, '3.3 卡片初始化')
    # data-n 都填上了
    empty = pg.evaluate("[...document.querySelectorAll('#p3 [data-n]')].filter(e => !e.textContent.trim()).map(e => e.dataset.n)")
    check(not empty, f'所有 data-n 都有值 {empty}')
    check(pg.locator('#p3 .lhead').inner_text().count('56 × 38') == 1, '标题里 56 × 38')

    # ---- 3.1 ----
    pg.locator('#p3-sizebv').scroll_into_view_if_needed(); T(700)
    for m in ['reg', 'h', 'w']:
        pg.click(f'#p3 [data-p3size="{m}"]'); T(250)
        st = pg.locator('#p3-size-st').inner_text()
        check(len(st) > 30, f'3.1 {m} 状态文字')
        shot('#p3 .p3-sizew', f'size_{m}')
    st = pg.locator('#p3-size-st').inner_text()
    check('56' in pg.locator('#p3-size-ro').inner_text(), '3.1 宽度读数有 56')
    for m in ['eco', 'std', 'proto', 'boat']:
        pg.click(f'#p3 [data-p3tier="{m}"]'); T(150)
        check(len(pg.locator('#p3-tier-x').inner_text()) > 30, f'3.1 门槛 {m}')
        if shots:
            pg.locator('#p3-tier').locator('xpath=../..').screenshot(path=OUT + f'{name}_tier_{m}.png')

    # ---- 3.2 ----
    pg.locator('#p3-ol').scroll_into_view_if_needed(); T(4200)
    check('首尾相接' in pg.locator('#p3-ol-st').inner_text(), '3.2 板框闭合说明')
    if shots:
        pg.locator('#p3-ol').locator('xpath=..').screenshot(path=OUT + f'{name}_outline.png')
    pg.click('#p3-ol-gap'); T(200)
    check('没有闭合' in pg.locator('#p3-ol-st').inner_text(), '3.2 去掉一段 → 不闭合')
    if shots:
        pg.locator('#p3-ol').locator('xpath=..').screenshot(path=OUT + f'{name}_outline_gap.png')
    pg.click('#p3-ol-gap'); T(100)
    pg.click('#p3-ol-draw'); T(900)
    if shots:
        pg.locator('#p3-ol').locator('xpath=..').screenshot(path=OUT + f'{name}_outline_mid.png')
    T(3000)
    for v, word in [('0.1', 'bad'), ('0.25', 'warn'), ('0.3', 'warn'), ('0.35', 'good'), ('0.45', 'good'), ('0.6', 'good')]:   # 0.3 = QB12，刚好压线（JLC 要 > 0.3）
        pg.locator('#p3-ec').fill(v); T(300)
        cls = pg.locator('#p3-ec-st').get_attribute('class')
        check(word in cls, f'3.2 铜离板边 {v} → {word}（{cls}）')
        if shots and v in ('0.1', '0.3'):
            pg.locator('#p3-ecsvg').locator('xpath=../..').screenshot(path=OUT + f'{name}_edge_{v}.png')
    check('J2' in pg.locator('#p3-ec-real').inner_text(), '3.2 最近的焊盘是 J2')

    # ---- 3.3 ----
    pg.locator('#p3-storybv').scroll_into_view_if_needed(); T(800)
    ro = pg.locator('#p3-ro').inner_text()
    check('1461' in ro, f'3.3 一堆时飞线 1461 mm（{ro[:40]!r}）')
    steps = pg.locator('#p3-steps [data-st]')
    check(steps.count() == 9, f'3.3 九个阶段（{steps.count()}）')
    for i in range(9):
        steps.nth(i).click(); T(2600 if i else 600)
        t = pg.locator('#p3-st-t').inner_text()
        check(len(t) > 3, f'3.3 第 {i} 组标题：{t}')
        if shots and (not QUICK or i in (0, 3, 8)):
            pg.locator('#p3 .p3-story').screenshot(path=OUT + f'{name}_story{i}.png')
    ro = pg.locator('#p3-ro').inner_text()
    check('737' in ro and '51 / 51' in ro, f'3.3 摆完：737 mm、51 / 51（{ro!r}）')
    check(abs(r - 737.23) < 0.1, f'board.json ratsnest 总长 {r:.2f}')
    check('90 处' in ro, '3.3 摆完交叉 90 处')
    offs = pg.evaluate("BoardViewer.get('p3-storybv').offsets")
    check(all(abs(v[0]) < 1e-9 and abs(v[1]) < 1e-9 for v in offs.values()), '3.3 全部回到真实位置')
    # 旧版对比
    steps.nth(3).click(); T(2600)
    pg.click('#p3-v1'); T(200)
    check(pg.evaluate("document.querySelectorAll('#p3-storybv .p3-v1box').length") == 5, '3.3 旧版 5 个框')
    if shots:
        pg.locator('#p3 .p3-story').screenshot(path=OUT + f'{name}_story3_v1.png')
    pg.click('#p3-gnd'); T(200)
    check('不算 GND' in pg.locator('#p3-ro').inner_text(), '3.3 GND 开关')
    pg.click('#p3-gnd'); T(100)
    # 播放
    pg.click('#p3-play'); T(500)
    check(pg.locator('#p3-play').inner_text().startswith('■'), '3.3 播放中')
    pg.click('#p3-play')

    # ---- 3.4 ----
    pg.locator('#p3-trybv').scroll_into_view_if_needed(); T(800)
    for ref, mv in [('C6', '1,0'), ('U5', '0,-1'), ('R3', '1,0')]:
        pg.click(f'#p3 [data-p3pick="{ref}"]'); T(600)
        check(ref in pg.locator('#p3-try-t').inner_text(), f'3.4 选 {ref}')
        if shots and ref == 'C6':
            pg.locator('#p3 .p3-try').screenshot(path=OUT + f'{name}_try_{ref}_home.png')
        for _ in range(6):
            pg.click(f'#p3 [data-p3mv="{mv}"]')
        T(200)
        st = pg.locator('#p3-try-st').get_attribute('class')
        check('good' not in st, f'3.4 {ref} 挪开 3 mm 后不再是 good（{st}）')
        if shots:
            pg.locator('#p3 .p3-try').screenshot(path=OUT + f'{name}_try_{ref}_moved.png')
        pg.click('#p3-try-home'); T(200)
        check('good' in pg.locator('#p3-try-st').get_attribute('class'), f'3.4 {ref} 放回原位')
    # 撞上：C6 往上挪 2 mm → 和 C5/C6 上面的谁重叠？往下挪 2.5 mm 撞 C5
    pg.click('#p3 [data-p3pick="C6"]'); T(300)
    for _ in range(5):
        pg.click('#p3 [data-p3mv="0,1"]')
    T(200)
    ro = pg.locator('#p3-try-ro').inner_text()
    check('撞上' in ro, f'3.4 C6 往下 2.5 mm 撞上 C5（{ro[-30:]!r}）')
    if shots:
        pg.locator('#p3 .p3-try').screenshot(path=OUT + f'{name}_try_C6_overlap.png')
    pg.click('#p3-try-home')
    # 拖动（鼠标）
    if vw > 500:
        pt = pg.evaluate("""() => { const v = BoardViewer.get('p3-trybv'); const f = QB.fp('C6'); const r = v.stage.getBoundingClientRect(); const vb = v.state().view;
            const x = (f.bbox[0] + f.bbox[2]) / 2, y = (f.bbox[1] + f.bbox[3]) / 2;
            return [r.left + (x - vb[0]) / vb[2] * r.width, r.top + (y - vb[1]) / vb[3] * r.height, r.width / vb[2]]; }""")
        pg.mouse.move(pt[0], pt[1]); pg.mouse.down(); pg.mouse.move(pt[0] - 5 * pt[2], pt[1], steps=6); pg.mouse.up(); T(200)
        o = pg.evaluate("BoardViewer.get('p3-trybv').offsets.C6")
        check(o and abs(o[0] + 5) < 0.3, f'3.4 鼠标拖动 C6 向左约 5 mm（{o}）')
        if shots:
            pg.locator('#p3 .p3-try').screenshot(path=OUT + f'{name}_try_drag.png')
        pg.click('#p3-try-home')
    # 底面
    pg.locator('#p3-sidebv').scroll_into_view_if_needed(); T(600)
    pg.click('#p3 [data-p3side="bottom"]'); T(300)
    check(pg.evaluate("document.querySelector('#p3-sidebv svg').classList.contains('flipped')"), '3.4 翻到底面')
    if shots:
        pg.locator('#p3-sidebv').locator('xpath=..').screenshot(path=OUT + f'{name}_side_bottom.png')
    pg.click('#p3 [data-p3side="top"]'); T(200)

    # ---- 3.5 ----
    pg.locator('#p3 .p3-kc').scroll_into_view_if_needed(); T(300)
    for k in range(1, 5):
        pg.click(f'#p3 [data-p3k="{k}"]'); T(200)
        vis = pg.evaluate(f"[...document.querySelectorAll('#p3 .p3-kp')].filter(p => !p.hidden).map(p => p.id)")
        check(vis == [f'p3-kp{k}'], f'3.5 第 {k} 步面板 {vis}')
        if shots and (not QUICK or k == 3):
            pg.locator('#p3 .p3-kc').screenshot(path=OUT + f'{name}_kicad{k}.png')
    pg.locator('#p3 .p3-keys').scroll_into_view_if_needed()
    for k in ['right', 'right', 'down', 'r', 'f', 'n', 'left']:
        pg.click(f'#p3 [data-p3key="{k}"]'); T(120)
    ro = pg.locator('#p3-key-ro').inner_text()
    check('90°' in ro and '底面' in ro and '0.5 mm' in ro, f'3.5 快捷键状态（{ro!r}）')
    pg.locator('#p3-keyfig').click(); pg.keyboard.press('Shift+M'); T(150)
    check(not pg.locator('#p3-exact').get_attribute('hidden'), '3.5 Shift+M 打开精确移动')
    pg.fill('#p3-ex-x', '0.3'); pg.click('#p3-exact button[type="submit"]'); T(300)
    check('栅格点上' in pg.locator('#p3-key-st').inner_text(), '3.5 精确移动提示')
    pg.locator('#p3-keyfig').click(); pg.keyboard.press('r'); T(300)
    check('180°' in pg.locator('#p3-key-ro').inner_text(), '3.5 键盘 R')
    if shots:
        pg.locator('#p3 .p3-keys').screenshot(path=OUT + f'{name}_keys.png')

    # ---- 3.6 ----
    for i in range(3):
        pg.locator('#p3 .quiz details').nth(i).locator('summary').click()
    T(200)
    check(all(len(pg.locator(f'#p3-q{i}').inner_text()) > 60 for i in (1, 2, 3)), '3.6 三个答案都有内容')
    if shots:
        pg.locator('#p3 .quiz').screenshot(path=OUT + f'{name}_quiz.png')
    pg.click('#p3 [data-p3q="2"]'); T(900)
    o = pg.evaluate("BoardViewer.get('p3-trybv').offsets.C6")
    check(o and o[0] < -5, f'3.6 第 2 题把 C6 挪开（{o}）')
    pg.click('#p3 [data-p3q="3"]'); T(900)
    check(pg.evaluate("document.querySelector('#p3-sidebv svg').classList.contains('flipped')"), '3.6 第 3 题翻到底面')
    pg.click('#p3 [data-p3q="1"]'); T(900)
    check(pg.locator('#p3 [data-p3size="h"]').get_attribute('aria-pressed') == 'true', '3.6 第 1 题切到竖着量')

    sw = pg.evaluate('document.documentElement.scrollWidth')
    check(sw <= vw, f'没有横向滚动（{sw}）')
    wide = pg.evaluate(f'''() => [...document.querySelectorAll('#p3 *')].filter(e => {{ const r = e.getBoundingClientRect(); return r.width && r.right > {vw} + 1; }}).slice(0, 5).map(e => e.tagName + '.' + e.className)''')
    check(not wide, f'第 3 课没有元素超出右边 {wide}')
    if shots:
        pg.locator('#p3').screenshot(path=OUT + f'{name}_full.png')
    check(not errs, '没有控制台错误' + ('：' + ' | '.join(errs[:5]) if errs else ''))
    b.close()


with sync_playwright() as p:
    run(p, 'desk_dark', 1280, 900, 'dark')
    run(p, 'phone_light', 400, 860, 'light')
    run(p, 'rm_dark', 1000, 800, 'dark', reduced=True, shots=not QUICK)
print('\n全部通过' if not fails else f'\n{len(fails)} 项失败：\n- ' + '\n- '.join(fails))
sys.exit(1 if fails else 0)
