"""把现成的渲染图 / 原理图转成小体积 webp，放进 assets/（build.py 用 @@ASSET:文件名@@ 内联）。只读源文件。"""
from PIL import Image
import os
S = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))  # = 仓库根
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets")
JOBS = [
    (f"{S}/hardware/pcb/prev/pcb3d_hero.png", "pcb3d_hero.webp", 1200, 78),
    (f"{S}/hardware/pcb/prev/pcb3d_top.png", "pcb3d_top.webp", 1200, 78),
    (f"{S}/hardware/pcb/schematic.png", "schematic.webp", 1400, 80),
]
for src, name, w, q in JOBS:
    im = Image.open(src).convert("RGB")
    if im.width > w:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    p = os.path.join(OUT, name)
    im.save(p, "WEBP", quality=q, method=6)
    print(name, im.size, os.path.getsize(p))
