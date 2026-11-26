"""第 5 课自测：桌面深色 1280 / 手机浅色 400 / 减少动画。截图放 _shots/p5/。
用法：PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 tools/test_p5.py [--quick]"""
import os, sys
if os.path.isdir('/opt/pw-browsers'): os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH', '/opt/pw-browsers')  # 容器；本机用 playwright 默认位置
from playwright.sync_api import sync_playwright

D = os.path.abspath(os.path.dirname(os.path.abspath(__file__)) + '/..') + '/'
PAGE = sys.argv[sys.argv.index('--page') + 1] if '--page' in sys.argv else '_preview_p5.html'   # 整页：--page _preview.html
URL = 'file://' + D + PAGE
OUT = D + ('_shots/full/p5/' if '--page' in sys.argv else '_shots/p5/')
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
    ctx = b.new_context(viewport={'width': vw, 'height': vh}, color_scheme=scheme,
                        reduced_motion='reduce' if reduced else 'no-preference', device_scale_factor=1, has_touch=vw < 500)
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    pg.on('console', lambda m: errs.append(f'CONSOLE {m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.goto(URL)
    pg.wait_for_timeout(1200)
    shot = lambda sel, fn: shots and pg.locator(sel).first.screenshot(path=OUT + f'{name}_{fn}.png')
    sec = lambda i: f'#p5 > .sec:nth-of-type({i + 1})'
    pg.locator('#p5 .lhead').scroll_into_view_if_needed()
    # 5.1
    pg.locator('#p5-xs').scroll_into_view_if_needed(); pg.wait_for_timeout(300)
    shot(sec(1), 's1_full')
    for i in range(4):
        pg.locator(f'#p5-vpre [data-pi="{i}"]').click(); pg.wait_for_timeout(150)
        shot('#p5 .p5-via', f's1_pre{i}')
    t = pg.locator('#p5-vchk').inner_text()
    check('✗' in t and '钻破' in t, f'0.4/0.3 预设报错（{t[:40]!r}）')
    pg.locator('#p5-open').click(); pg.wait_for_timeout(100)
    shot('#p5 .p5-via', 's1_open')
    pg.locator('#p5-tent').click()
    pg.locator('#p5-vpre [data-pi="0"]').click()
    t = pg.locator('#p5-vro').inner_text()
    check('0.15 mm' in t, f'0.6/0.3 焊环 0.15（{t[:30]!r}）')
    # 5.2
    pg.locator('#p5-bv1').scroll_into_view_if_needed(); pg.wait_for_timeout(500)
    expect = {'signal': 28, 'fanout': 32, 'stitch': 102, 'thermal': 11, 'module': 4, 'all': 177}
    for r, n in expect.items():
        pg.locator(f'#p5-roles [data-role="{r}"]').click(); pg.wait_for_timeout(250 if reduced else 800)
        k = pg.evaluate("document.querySelectorAll('#p5-bv1 .g-hl .ring').length")
        check(k == n, f'过孔 {r}：{k} 个圈（应 {n}）')
        shot(sec(2) + ' .widget', f's2_{r}')
        if r in ('fanout', 'stitch', 'thermal', 'signal'):
            subs = pg.locator('#p5-r-sub [data-sub]')
            for j in range(subs.count()):
                subs.nth(j).click(); pg.wait_for_timeout(250 if reduced else 800)
                shot(sec(2) + ' .widget', f's2_{r}_sub{j}')
    # 5.3
    pg.locator('#p5-loop').scroll_into_view_if_needed(); pg.wait_for_timeout(300)
    shot(sec(3) + ' .widget', 's3_0')
    pg.locator('#p5-slotmax').click(); pg.wait_for_timeout(200)
    shot(sec(3) + ' .widget', 's3_max')
    t = pg.locator('#p5-lro').inner_text()
    check('倍' in t, f'回路读数（{t[:40]!r}）')
    pg.evaluate("const s=document.getElementById('p5-slot'); s.value=10; s.dispatchEvent(new Event('input'))"); pg.wait_for_timeout(150)
    shot(sec(3) + ' .widget', 's3_10')
    pg.evaluate("const s=document.getElementById('p5-slot'); s.value=14; s.dispatchEvent(new Event('input'))"); pg.wait_for_timeout(150)
    shot(sec(3) + ' .widget', 's3_14')
    pg.locator('#p5-bridge').click(); pg.wait_for_timeout(150)
    shot(sec(3) + ' .widget', 's3_bridge')
    shot(sec(3), 's3_full')
    # 5.4
    pg.locator('#p5-bv2').scroll_into_view_if_needed(); pg.wait_for_timeout(500)
    for i in range(6):
        pg.locator(f'#p5-psteps [data-ps="{i}"]').click(); pg.wait_for_timeout(300 if reduced else 1700)
        shot(sec(4) + ' .widget', f's4_step{i}')
    zF = pg.evaluate("getComputedStyle(document.querySelector('#p5-bv2 .g-zoneF')).display")
    check(zF == 'none', f'第 ⑥ 步只看底层（顶层铺铜 display={zF}）')
    shot(sec(4), 's4_full')
    # 5.5
    pg.locator('#p5-hs').scroll_into_view_if_needed(); pg.wait_for_timeout(300 if reduced else 4500)
    shot(sec(5) + ' .widget', 's5_iron')
    st = pg.locator('#p5-hst').inner_text()
    check(('花焊盘' in st) or ('化锡' in st), f'烙铁结果文字（{st[:30]!r}）')
    pg.locator('#p5-oven').click(); pg.wait_for_timeout(300 if reduced else 4500)
    shot(sec(5) + ' .widget', 's5_oven')
    st = pg.locator('#p5-hst').inner_text()
    check('立碑' in st and '小得多' in st, f'回流炉结果（{st[:30]!r}）')   # 事实核查 P5-1：差别变小但没消失
    shot(sec(5), 's5_full')
    # 5.6
    pg.locator('#p5-bv3').scroll_into_view_if_needed(); pg.wait_for_timeout(500)
    for k in ('antenna', 'module', 'usb'):
        pg.locator(f'#p5-keeps [data-k="{k}"]').click(); pg.wait_for_timeout(300 if reduced else 900)
        shot(sec(6) + ' .widget', f's6_{k}')
    shot(sec(6), 's6_full')
    # 5.7
    for i in range(3):
        pg.locator('#p5 .quiz details').nth(i).locator('summary').click()
    pg.wait_for_timeout(200)
    shot(sec(7), 's7_quiz')
    pg.locator('#p5 [data-p5q="1"]').click(); pg.wait_for_timeout(800)
    t = pg.locator('#p5-vro').inner_text()
    check('0.05 mm' in t, f'第 1 题按钮把滑块设成 0.4/0.3（{t[:20]!r}）')
    pg.locator('#p5 [data-p5q="3"]').click(); pg.wait_for_timeout(1000)
    k = pg.evaluate("document.querySelectorAll('#p5-bv1 .g-hl .ring').length")
    check(k == 11, f'第 3 题标出散热孔（{k}）')
    sw = pg.evaluate('document.documentElement.scrollWidth')
    check(sw <= vw, f'没有横向滚动（{sw} ≤ {vw}）')
    wide = pg.evaluate(f'''() => [...document.querySelectorAll('#p5 *')].filter(e => {{ const r = e.getBoundingClientRect(); return r.right > {vw} + 1 && !e.closest('.wscroll') && !e.closest('svg') && !e.closest('canvas'); }}).slice(0, 5).map(e => e.tagName + '.' + e.className + '#' + e.id)''')
    check(not wide, f'第 5 课没有元素超出右边：{wide}')
    if shots:
        pg.locator('#p5').screenshot(path=OUT + f'{name}_lesson.png')
    check(not errs, '没有控制台错误' + ('：' + ' | '.join(errs[:5]) if errs else ''))
    b.close()


with sync_playwright() as p:
    run(p, 'desk_dark', 1280, 900, 'dark')
    if not QUICK:
        run(p, 'phone_light', 400, 860, 'light')
        run(p, 'rm_dark', 1000, 800, 'dark', reduced=True, shots=True)
print('\n全部通过' if not fails else f'\n{len(fails)} 项失败：\n- ' + '\n- '.join(fails))
sys.exit(1 if fails else 0)
