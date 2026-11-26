"""Playwright 测试：桌面深色 1280 / 手机浅色 400 / 减少动画。
检查：没有控制台错误、没有横向滚动、查看器交互能用；截图放在 _shots/。
用法：PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 tools/test.py"""
import os, sys, json
if os.path.isdir('/opt/pw-browsers'): os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH', '/opt/pw-browsers')  # 容器；本机用 playwright 默认位置
from playwright.sync_api import sync_playwright

D = os.path.abspath(os.path.dirname(os.path.abspath(__file__)) + '/..') + '/'
PAGE = sys.argv[sys.argv.index('--page') + 1] if '--page' in sys.argv else '_preview.html'
OUT = D + '_shots/' + (PAGE.replace('_preview_', '').replace('.html', '') + '/' if PAGE != '_preview.html' else 'full/')
os.makedirs(OUT, exist_ok=True)
URL = 'file://' + D + PAGE
fails = []


def check(cond, msg):
    print(('  ok   ' if cond else '  FAIL ') + msg)
    if not cond:
        fails.append(msg)


def run(p, name, vw, vh, scheme, reduced=False, shots=True):
    print(f'== {name} ({vw}px, {scheme}{", reduced motion" if reduced else ""})')
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': vw, 'height': vh}, color_scheme=scheme, reduced_motion='reduce' if reduced else 'no-preference',
                        device_scale_factor=1, has_touch=vw < 500)
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    pg.on('console', lambda m: errs.append(f'CONSOLE {m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.goto(URL)
    pg.wait_for_timeout(1500)
    sw = pg.evaluate('document.documentElement.scrollWidth')
    check(sw <= vw, f'没有横向滚动（scrollWidth {sw} ≤ {vw}）')
    # 宽于视口的元素
    # .wscroll 里面的内容本来就可以比屏幕宽（横向滚动的是 .wscroll 自己），只查 .wscroll 本身
    wide = pg.evaluate(f'''() => [...document.querySelectorAll('body *')].filter(e => {{ const r = e.getBoundingClientRect(); return r.right > {vw} + 1 && getComputedStyle(e).position !== 'fixed' && !(e.parentElement && e.parentElement.closest('.wscroll')); }}).slice(0, 5).map(e => e.tagName + '.' + e.className + '#' + e.id)''')
    check(not wide, f'没有元素超出右边：{wide}')
    check(pg.evaluate('BoardViewer.all.length') >= 2, '至少两个查看器实例')
    # ---- 0.1 ----
    if shots:
        pg.locator('#p0 .lhead').scroll_into_view_if_needed()
        pg.screenshot(path=OUT + f'{name}_top.png')
    # ---- 0.2 流程：逐步点 ----
    nodes = pg.locator('#p0-flow .p0-node')
    check(nodes.count() == 9, f'流程条 9 个节点（{nodes.count()}）')
    wait = {0: 400, 1: 1300, 2: 3600, 3: 4200, 4: 3200, 5: 1800, 6: 1400, 7: 4300, 8: 400}
    for i in range(9):
        pg.locator('#p0-flow .p0-node').nth(i).click()
        pg.wait_for_timeout(300 if reduced else wait[i])
        t = pg.locator('#p0-st-title').inner_text()
        check(t.startswith(f'第 {i + 1} 步'), f'第 {i + 1} 步卡片标题：{t}')
        if shots:
            pg.locator('#p0 .p0-flowbox').screenshot(path=OUT + f'{name}_step{i + 1}.png')
    # 第 4 步之后走线应该是真的显示出来了
    st = pg.evaluate("BoardViewer.get('p0-bv').state()")
    check(st['tracks'] is True, '走线动画结束后 tracks=true')
    # 胶片按钮
    pg.locator('#p0-flow .p0-node').nth(6).click(); pg.wait_for_timeout(300)
    pg.locator('#p0-st-facts [data-film="B.Cu"]').click(); pg.wait_for_timeout(300)
    st = pg.evaluate("BoardViewer.get('p0-bv').state()")
    check(st['mode'] == 'film' and st['layers'] == ['B.Cu'], f'点文件名切到胶片 B.Cu（{st["mode"]} {st["layers"]}）')
    # 播放按钮
    pg.click('#p0-play'); pg.wait_for_timeout(600)
    check(pg.locator('#p0-play').inner_text().startswith('■'), '播放中按钮变成停止')
    pg.click('#p0-play')
    # ---- 0.3 导览 ----
    tv = pg.locator('#p0-tourbv')
    tv.scroll_into_view_if_needed(); pg.wait_for_timeout(500)
    for i in range(9):
        pg.locator(f'#p0-stops [data-stop="{i}"]').click(); pg.wait_for_timeout(250 if reduced else 650)
        if shots and i in (0, 2, 5, 7):
            pg.locator('#p0 .p0-tour').screenshot(path=OUT + f'{name}_stop{i + 1}.png')
    check('按键' in pg.locator('#p0-stop-title').inner_text(), '第 9 站标题')
    # 点元件：找 U2 中心的屏幕坐标
    pg.evaluate("BoardViewer.get('p0-tourbv').clear().reset({animate:false})")
    pg.evaluate("BoardViewer.get('p0-tourbv').stage.scrollIntoView({block:'center'})")
    pg.wait_for_timeout(300)
    pt = pg.evaluate("""() => { const v = BoardViewer.get('p0-tourbv'); const f = QB.fp('U2'); const r = v.stage.getBoundingClientRect();
        const x = (f.bbox[0] + f.bbox[2]) / 2 + 1.2, y = (f.bbox[1] + f.bbox[3]) / 2 + 1.8;
        return [r.left + (x - v.vb[0]) / v.vb[2] * r.width, r.top + (y - v.vb[1]) / v.vb[3] * r.height]; }""")
    pg.mouse.click(pt[0], pt[1]); pg.wait_for_timeout(300)
    panel = pg.locator('#p0-tourbv .bv-panel').inner_text()
    check('U2' in panel and 'DRV8833' in panel, f'点 U2 出信息卡（{panel[:30]!r}）')
    # 卡片里点网络
    pg.locator('#p0-tourbv .bv-panel [data-net="VSYS"]').first.click(); pg.wait_for_timeout(300)
    check('VSYS' in pg.locator('#p0-tourbv .bv-panel').inner_text(), '卡片里点网络 → 网络卡')
    check(pg.evaluate("document.querySelector('#p0-tourbv svg').classList.contains('dim')"), '高亮网络时其余变暗')
    # 缩放按钮
    vb0 = pg.evaluate("BoardViewer.get('p0-tourbv').vb[2]")
    pg.locator('#p0-tourbv [data-z="in"]').click(); pg.wait_for_timeout(700)
    vb1 = pg.evaluate("BoardViewer.get('p0-tourbv').vb[2]")
    check(vb1 < vb0 * 0.8, f'+ 按钮放大（视野宽 {vb0:.1f} → {vb1:.1f}）')
    # 拖动平移（鼠标）
    if vw > 500:
        r = pg.evaluate("(() => { const r = BoardViewer.get('p0-tourbv').stage.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; })()")
        x0 = pg.evaluate("BoardViewer.get('p0-tourbv').vb[0]")
        pg.mouse.move(r[0], r[1]); pg.mouse.down(); pg.mouse.move(r[0] + 80, r[1] + 10, steps=5); pg.mouse.up()
        x1 = pg.evaluate("BoardViewer.get('p0-tourbv').vb[0]")
        check(x1 < x0, f'拖动平移（x {x0:.2f} → {x1:.2f}）')
        # Ctrl + 滚轮
        pg.mouse.move(r[0], r[1]); w0 = pg.evaluate("BoardViewer.get('p0-tourbv').vb[2]")
        pg.keyboard.down('Control'); pg.mouse.wheel(0, -300); pg.keyboard.up('Control'); pg.wait_for_timeout(200)
        w1 = pg.evaluate("BoardViewer.get('p0-tourbv').vb[2]")
        check(w1 < w0, f'Ctrl+滚轮缩放（{w0:.2f} → {w1:.2f}）')
    else:
        # 手机：双击放大
        pg.locator('#p0-tourbv [data-z="fit"]').click(); pg.wait_for_timeout(600)
        pg.evaluate("BoardViewer.get('p0-tourbv').stage.scrollIntoView({block:'center'})"); pg.wait_for_timeout(200)
        r = pg.evaluate("(() => { const r = BoardViewer.get('p0-tourbv').stage.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; })()")
        w0 = pg.evaluate("BoardViewer.get('p0-tourbv').vb[2]")
        pg.touchscreen.tap(r[0], r[1]); pg.wait_for_timeout(120); pg.touchscreen.tap(r[0], r[1]); pg.wait_for_timeout(700)
        w1 = pg.evaluate("BoardViewer.get('p0-tourbv').vb[2]")
        check(w1 < w0, f'双击放大（{w0:.2f} → {w1:.2f}）')
    # 模式 / 层 / 翻面
    pg.locator('#p0-tourbv [data-z="fit"]').click(); pg.wait_for_timeout(600)
    pg.locator('#p0-tourbv [data-mode="made"]').click(); pg.wait_for_timeout(200)
    check(pg.evaluate("document.querySelector('#p0-tourbv svg').classList.contains('made')"), '切到成品样子')
    if shots:
        tv.screenshot(path=OUT + f'{name}_tour_made.png')
    pg.locator('#p0-tourbv [data-side="bottom"]').click(); pg.wait_for_timeout(200)
    check(pg.evaluate("document.querySelector('#p0-tourbv svg').classList.contains('flipped')"), '翻到底面')
    if shots:
        tv.screenshot(path=OUT + f'{name}_tour_bottom.png')
    pg.locator('#p0-tourbv [data-side="top"]').click()
    pg.locator('#p0-tourbv [data-mode="layers"]').click(); pg.wait_for_timeout(200)
    if pg.evaluate("document.querySelector('#p0-tourbv .bv-tools').classList.contains('collapsed')"):
        check(vw < 560, '窄屏时图层行默认收起')
        pg.locator('#p0-tourbv .bv-moreb').click(); pg.wait_for_timeout(100)
        check(not pg.evaluate("document.querySelector('#p0-tourbv .bv-tools').classList.contains('collapsed')"), '点“图层”展开')
    pg.locator('#p0-tourbv [data-l="Zones"]').click(); pg.wait_for_timeout(150)
    hidden = pg.evaluate("getComputedStyle(document.querySelector('#p0-tourbv .g-zoneF')).display")
    check(hidden == 'none', '层开关：关掉铺铜')
    pg.locator('#p0-tourbv [data-l="Zones"]').click()
    # 线宽 + API
    pg.locator('#p0-tourbv [data-w="0.8"]').click(); pg.wait_for_timeout(200)
    n = pg.evaluate("document.querySelectorAll('#p0-tourbv .g-hl .core line').length")
    check(n == 56, f'线宽 0.8 高亮 56 段（{n}）')
    res = pg.evaluate("BoardViewer.get('p0-tourbv').animateRoute('VSYS', {duration: 0.6}).then(x => x)")
    check(res is True, 'animateRoute 结束返回 true')
    n = pg.evaluate("document.querySelectorAll('#p0-tourbv .g-hl .core line').length")
    check(n == 44, f'animateRoute 后 VSYS 保持高亮（{n} 段）')
    pg.evaluate("BoardViewer.get('p0-tourbv').highlightVias('stitch')"); pg.wait_for_timeout(100)
    n = pg.evaluate("document.querySelectorAll('#p0-tourbv .g-hl .ring').length")
    check(n == 102, f'缝合过孔 102 个（{n}）')
    # 自测按钮
    pg.locator('#p0 details').nth(2).locator('summary').click()
    pg.locator('#p0 [data-p0q="3"]').click(); pg.wait_for_timeout(600)
    n = pg.evaluate("document.querySelectorAll('#p0-tourbv .g-hl .ring').length")
    check(n == 149, f'自测第 3 题标出 149 个接地过孔（{n}）')
    if shots:
        pg.locator('#p0 .quiz').screenshot(path=OUT + f'{name}_quiz.png')
        pg.locator('#p0-next8').screenshot(path=OUT + f'{name}_next8.png')
        pg.locator('#p0 .two').screenshot(path=OUT + f'{name}_honest.png')
        pg.screenshot(path=OUT + f'{name}_full.png', full_page=True)
    sw = pg.evaluate('document.documentElement.scrollWidth')
    check(sw <= vw, f'交互之后仍然没有横向滚动（{sw}）')
    check(not errs, '没有控制台错误' + ('：' + ' | '.join(errs[:5]) if errs else ''))
    b.close()


with sync_playwright() as p:
    run(p, 'desk_dark', 1280, 900, 'dark')
    run(p, 'phone_light', 400, 860, 'light')
    run(p, 'rm_dark', 1000, 800, 'dark', reduced=True, shots=False)
print('\n全部通过' if not fails else f'\n{len(fails)} 项失败：\n- ' + '\n- '.join(fails))
sys.exit(1 if fails else 0)
