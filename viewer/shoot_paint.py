"""渲染 QB12 涂装方案：python viewer/shoot_paint.py <输出目录> [方案号...]
每个方案出 hero / side 两张，再拼成对比总图 QB12_涂装方案.png。"""
import functools
import os
import http.server
import sys
import threading
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]          # 仓库根
OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
NAMES = ['原定方案', '经典游艇', '竞速黑橙', '救援橙', '复古薄荷']
IDS = [int(a) for a in sys.argv[2:]] or list(range(len(NAMES)))
VIEWS = {'hero': (1400, 900), 'side': (1400, 520)}

H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
H.log_message = lambda *a, **k: None
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8781), H)
threading.Thread(target=srv.serve_forever, daemon=True).start()

with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    for s in IDS:
        for v, (w, h) in VIEWS.items():
            pg = b.new_page(viewport={'width': w, 'height': h})
            msgs = []
            pg.on('console', lambda m: msgs.append(m.text))
            pg.on('pageerror', lambda e: msgs.append(str(e)))
            pg.goto(f'http://127.0.0.1:8781/viewer/paint.html?s={s}&view={v}')
            pg.wait_for_function('window.__done === true', timeout=180000)
            pg.screenshot(path=str(OUT / f'paint_{s}_{v}.png'))
            print(s, v, 'ok', [m for m in msgs if 'rror' in m][:3])
            pg.close()
    b.close()
srv.shutdown()

# 拼图：每行一个方案，左 hero 右 side
font = ImageFont.truetype(os.environ.get('QB12_FONT', os.path.expanduser('~/Library/Fonts/NotoSansCJKsc-Bold.otf')), 44)  # 没有这个字体时用 QB12_FONT 指定
hw, hh = 840, 540
sw, sh = 840, 312
rows = []
for s in IDS:
    hero = Image.open(OUT / f'paint_{s}_hero.png').resize((hw, hh), Image.LANCZOS)
    side = Image.open(OUT / f'paint_{s}_side.png').resize((sw, sh), Image.LANCZOS)
    row = Image.new('RGB', (hw + sw, hh), '#eef1f4')
    row.paste(hero, (0, 0)); row.paste(side, (hw, (hh - sh) // 2 + 40))
    ImageDraw.Draw(row).text((hw + 30, 40), f'{s}. {NAMES[s]}', font=font, fill='#1f2a36')
    rows.append(row)
sheet = Image.new('RGB', (hw + sw, hh * len(rows) + 6 * (len(rows) - 1)), '#c9d1d9')
for i, r in enumerate(rows):
    sheet.paste(r, (0, i * (hh + 6)))
sheet.save(OUT / 'QB12_涂装方案.png')
print('sheet', sheet.size)
