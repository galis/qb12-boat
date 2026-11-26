import http.server
import functools
import threading
import sys
from playwright.sync_api import sync_playwright

ROOT = sys.argv[1]
OUT = sys.argv[2]
Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
Handler.log_message = lambda *a, **k: None
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8765), Handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()

views = {"hero": (1600, 1000), "rear": (1600, 1000), "side": (1600, 700), "top": (1200, 1000)}
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    for v, (w, h) in views.items():
        pg = b.new_page(viewport={"width": w, "height": h})
        msgs = []
        pg.on("console", lambda m: msgs.append(m.text))
        pg.on("pageerror", lambda e: msgs.append(str(e)))
        pg.goto(f"http://127.0.0.1:8765/render.html?view={v}")
        try:
            pg.wait_for_function("window.__done === true", timeout=120000)
        except Exception as e:
            print(v, "timeout", msgs[:5])
            continue
        pg.screenshot(path=f"{OUT}/render_{v}.png")
        print(v, "ok", msgs[:3])
        pg.close()
    b.close()
srv.shutdown()
