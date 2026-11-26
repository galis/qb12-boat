import sys
from playwright.sync_api import sync_playwright
svg = open(sys.argv[1]).read()
html = "<!doctype html><html><head><meta charset='utf-8'><style>html,body{margin:0;background:#F7F8F6}</style></head><body>" + svg + "</body></html>"
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 2400, "height": 1700}, device_scale_factor=2)
    pg.set_content(html)
    pg.wait_for_timeout(500)
    pg.screenshot(path=sys.argv[2], full_page=False)
    pg.pdf(path=sys.argv[3], width="2400px", height="1700px", print_background=True)
    b.close()
