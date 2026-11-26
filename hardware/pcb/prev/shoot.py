import http.server, functools, threading, sys
from playwright.sync_api import sync_playwright
ROOT, OUT = sys.argv[1], sys.argv[2]
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT); H.log_message = lambda *a, **k: None
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8766), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
views = {"top": (1600, 1150), "hero": (1600, 1050), "low": (1600, 1000)}
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    for v, (w, h) in views.items():
        pg = b.new_page(viewport={"width": w, "height": h}); msgs = []
        pg.on("console", lambda m: msgs.append(m.text)); pg.on("pageerror", lambda e: msgs.append(str(e)))
        pg.goto(f"http://127.0.0.1:8766/pcb3d.html?view={v}")
        try:
            pg.wait_for_function("window.__done === true", timeout=240000)
            pg.screenshot(path=f"{OUT}/pcb3d_{v}.png"); print(v, "ok", msgs[:3])
        except Exception as e:
            print(v, "fail", msgs[:5], e)
        pg.close()
    b.close()
srv.shutdown()
