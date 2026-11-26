"""第 4 课自己的 Playwright 检查 + 截图（_shots/p4/）。
用法：PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 tools/test_p4.py [--page _preview_p4.html] [--quick]"""
import os, sys
if os.path.isdir('/opt/pw-browsers'): os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH', '/opt/pw-browsers')  # 容器；本机用 playwright 默认位置
from playwright.sync_api import sync_playwright

D = os.path.abspath(os.path.dirname(os.path.abspath(__file__)) + '/..') + '/'
PAGE = sys.argv[sys.argv.index('--page') + 1] if '--page' in sys.argv else '_preview_p4.html'
OUT = D + ('_shots/full/p4/' if '--page' in sys.argv else '_shots/p4/')   # --page（整页测试）时截图另放
os.makedirs(OUT, exist_ok=True)
URL = 'file://' + D + PAGE
fails = []


def check(cond, msg):
    print(('  ok   ' if cond else '  FAIL ') + msg)
    if not cond:
        fails.append(msg)


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
    W = (lambda ms: pg.wait_for_timeout(150 if reduced else ms))
    shot = (lambda sel, fn: pg.locator(sel).screenshot(path=OUT + f'{name}_{fn}.png') if shots else None)

    # 4.1
    pg.locator('#p4 .lhead').scroll_into_view_if_needed()
    if shots:
        pg.screenshot(path=OUT + f'{name}_head.png')
    pg.locator('#p4-wsvg').scroll_into_view_if_needed(); W(300)
    shot('#p4 .p4-calc', 'calc_08_2A')
    ro = pg.locator('#p4-ro').inner_text()
    check('A' in ro and 'mV' in ro, f'4.1 读数有内容：{ro[:60]!r}')
    pg.locator('#p4-wmarks [data-w="0.2"]').click(); W(200)
    st = pg.locator('#p4-st').get_attribute('class')
    check('bad' in st, f'0.2 mm @ 2 A 判为过热（{st}）')
    shot('#p4 .p4-calc', 'calc_02_2A')
    pg.locator('#p4-amps [data-a="0.1"]').click(); W(200)
    check('good' in pg.locator('#p4-st').get_attribute('class'), '0.2 mm @ 0.1 A 判为够用')
    pg.locator('#p4-w').fill('2'); W(200)
    shot('#p4 .p4-calc', 'calc_2mm_01A')
    pg.locator('#p4-wmarks [data-w="0.4"]').click(); pg.locator('#p4-amps [data-a="1"]').click(); W(200)
    shot('#p4 .p4-calc', 'calc_04_1A')

    # 4.2
    pg.locator('#p4-cls').scroll_into_view_if_needed(); W(200)
    shot('#p4 .tbl', 'classes')
    pg.locator('#p4-bv').scroll_into_view_if_needed(); W(600)
    for w, n in (('0.8', 56), ('0.49', 5), ('0.35', 3), ('0.25', 1), ('0.2', 191)):
        pg.locator(f'#p4-wchips [data-w="{w}"]').click(); W(700)
        k = pg.evaluate("document.querySelectorAll('#p4-bv .g-hl .core line').length")
        check(k == n, f'线宽 {w} 高亮 {n} 段（{k}）')
        if shots and w in ('0.8', '0.49', '0.35'):
            shot('#p4 .p4-wbox', f'width_{w}')
    for r in ('batt', 'motor', '3v3', 'vbus', 'sig'):
        pg.locator(f'#p4-routes [data-r="{r}"]').click(); W(5200 if r == 'batt' else 2600)
        t = pg.locator('#p4-wc-t').inner_text()
        check(len(t) > 3, f'路线 {r} 卡片：{t}')
        if shots:
            shot('#p4 .p4-wbox', f'route_{r}')
    k = pg.evaluate("document.querySelectorAll('#p4-bv .g-hl .core line').length")
    check(k == 12, f'nSLEEP 选中后高亮 12 段（{k}）')

    # 4.3
    pg.locator('#p4-gsvg').scroll_into_view_if_needed(); W(200)
    for g, e, fn in (('0.1', '0.2', 'gap_010_wide'), ('0.18', '0.2', 'gap_018_wide'), ('0.15', '-0.2', 'gap_015_narrow')):
        pg.locator(f'#p4-gaps [data-g="{g}"]').click(); pg.locator(f'#p4-etch [data-e="{e}"]').click(); W(150)
        shot('#p4 .p4-gapw', fn)
        if g == '0.1':
            check('bad' in pg.locator('#p4-gst').get_attribute('class'), '0.10 + 偏宽 → 判为太窄')
    pg.locator('#p4-gapbv').scroll_into_view_if_needed(); W(700)
    n = pg.locator('#p4-gpairs [data-gp]').count()
    check(n >= 3, f'最窄的缝按钮 {n} 个')
    for i in range(n):
        pg.locator(f'#p4-gpairs [data-gp="{i}"]').click(); W(700)
        if shots:
            shot('#p4 .p4-gapbox', f'gappair_{i}')
    txt = pg.locator('#p4-g-min').inner_text()
    check('0.181' in txt, f'最窄的缝 0.181 mm（{txt}）')

    # 4.4
    pg.locator('#p4-lbv').scroll_into_view_if_needed(); W(500)
    for k in ('F', 'B', 'via', 'both'):
        pg.locator(f'#p4-lbtns [data-l="{k}"]').click(); W(300)
        if shots and k in ('B', 'via'):
            shot('#p4-lbv', f'layer_{k}')
    if shots:
        pg.locator('#p4-bar-n').scroll_into_view_if_needed()
        pg.locator('#p4 .sec').nth(3).screenshot(path=OUT + f'{name}_sec44.png')

    # 4.5
    pg.locator('#p4-arbv').scroll_into_view_if_needed(); W(600)
    waits = [600, 600, 4600, 900, 2800]
    for i in range(5):
        pg.locator(f'#p4-ar-steps [data-ar="{i}"]').click(); W(waits[i])
        t = pg.locator('#p4-ar-t').inner_text()
        check(t.startswith('①②③④⑤'[i]), f'自动布线第 {i + 1} 步：{t}')
        if shots:
            shot('#p4 .p4-arstage', f'ar_{i + 1}')
    nb = pg.evaluate("document.querySelectorAll('#p4-arbv .g-ann .bx').length")
    check(True, f'(第 4 步方框数在上一步被清掉：{nb})')
    pg.locator('#p4-ar-steps [data-ar="3"]').click(); W(900)
    nb = pg.evaluate("document.querySelectorAll('#p4-arbv .g-ann .bx').length")
    check(nb == 4, f'第 4 步标出 4 处 T 形接头（{nb}）')
    for k in pg.locator('#p4-chk [data-ck]').all():
        k.click(); W(500)
    if shots:
        pg.locator('#p4-chk').scroll_into_view_if_needed()
        pg.locator('#p4 .sec').nth(4).locator('.widget').screenshot(path=OUT + f'{name}_chk.png')
    pg.click('#p4-ar-play'); W(500)
    check(pg.locator('#p4-ar-play').inner_text().startswith('■') or reduced, '播放中按钮变成停止')
    pg.click('#p4-ar-play')

    # 4.6
    pg.locator('#p4-usbbv').scroll_into_view_if_needed(); W(2600)
    if shots:
        shot('#p4-usbbv', 'usb_anim')
    pg.locator('#p4-ubtns [data-u="dn"]').click(); W(400)
    check('USB_DN' in pg.locator('#p4-usbbv .bv-panel').inner_text(), 'D− 网络卡')
    pg.locator('#p4-tsvg').scroll_into_view_if_needed(); W(200)
    shot('#p4-tsvg', 'timing_fs')
    pg.locator('#p4-tbtns [data-t="hs"]').click(); W(200)
    check('bad' in pg.locator('#p4-tst').get_attribute('class'), '高速 → 判为必须按差分对')
    shot('#p4-tsvg', 'timing_hs')

    # 4.7
    pg.locator('#p4-msvg').scroll_into_view_if_needed()
    for m in ('hl', 'shove', 'walk'):
        pg.locator(f'#p4-modes [data-m="{m}"]').click(); W(2100)
        shot('#p4-msvg', f'mode_{m}')
    if shots:
        pg.locator('#p4 .p4-shots').nth(1).screenshot(path=OUT + f'{name}_shots47.png')

    # 4.8
    for i in range(3):
        pg.locator('#p4 .quiz details').nth(i).locator('summary').click()
    for q in ('1', '2', '3'):
        pg.locator(f'#p4 [data-p4q="{q}"]').click(); W(1200)
    if shots:
        pg.locator('#p4 .quiz').screenshot(path=OUT + f'{name}_quiz.png')
        pg.locator('#p4 .next').screenshot(path=OUT + f'{name}_next.png')
        pg.locator('#p4').screenshot(path=OUT + f'{name}_full.png')
    sw = pg.evaluate('document.documentElement.scrollWidth')
    check(sw <= vw, f'交互之后没有横向滚动（{sw}）')
    wide = pg.evaluate(f'''() => [...document.querySelectorAll('#p4 *')].filter(e => {{ if (e.closest('.bv-stage')) return false; const r = e.getBoundingClientRect(); return r.right > {vw} + 1; }}).slice(0, 5).map(e => e.tagName + '.' + e.className + '#' + e.id)''')
    check(not wide, f'第 4 课没有元素超出右边：{wide}')
    check(not errs, '没有控制台错误' + ('：' + ' | '.join(errs[:5]) if errs else ''))
    b.close()


with sync_playwright() as p:
    run(p, 'desk_dark', 1280, 900, 'dark')
    if '--quick' not in sys.argv:
        run(p, 'phone_light', 400, 860, 'light')
        run(p, 'rm_dark', 1000, 800, 'dark', reduced=True, shots=False)
print('\n全部通过' if not fails else f'\n{len(fails)} 项失败：\n- ' + '\n- '.join(fails))
sys.exit(1 if fails else 0)
